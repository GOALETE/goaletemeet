import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for adding user to subscription
const createSubscriptionSchema = z.object({
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  planType: z.enum(['daily', 'monthly', 'unlimited']),
  price: z.number().min(0).optional().default(0)
});

// Schema for checking meeting availability
const checkMeetingSchema = z.object({
  date: z.string(), // YYYY-MM-DD format
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    if (token !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'checkMeeting') {
      // Check if meeting exists for specific date
      const parsed = checkMeetingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ 
          error: "Invalid request", 
          details: parsed.error.errors 
        }, { status: 400 });
      }

      const { date } = parsed.data;
      
      const meeting = await prisma.meeting.findFirst({
        where: {
          meetingDate: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(`${date}T23:59:59.999Z`)
          }
        },
        select: {
          id: true,
          meetingDate: true,
          platform: true,
          meetingTitle: true,
          startTime: true,
          endTime: true,
          meetingLink: true
        }
      });

      return NextResponse.json({
        meetingExists: !!meeting,
        meeting: meeting || null
      });

    } else if (action === 'createSubscription') {
      // Create subscription for user
      const parsed = createSubscriptionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ 
          error: "Invalid request", 
          details: parsed.error.errors 
        }, { status: 400 });
      }

      const { userId, startDate, endDate, planType, price } = parsed.data;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      });

      if (!user) {
        return NextResponse.json({ 
          error: "User not found" 
        }, { status: 404 });
      }

      // Create a subscription for this user
      const subscription = await prisma.subscription.create({
        data: {
          userId: userId,
          planType: planType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'active',
          paymentStatus: 'admin-added',
          duration: planType === 'daily' ? 1 : 
                   planType === 'monthly' ? 30 :
                   365, // unlimited gets 365 days
          price: price,
          orderId: `admin-${Date.now()}-${userId.slice(-6)}`
        }
      });

      // Send invitation email for admin-created subscriptions
      try {
        // Find meeting for the start date if it exists
        const meeting = await prisma.meeting.findFirst({
          where: {
            meetingDate: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lt: new Date(`${startDate}T23:59:59.999Z`)
            }
          },
          select: {
            id: true,
            meetingDate: true,
            platform: true,
            meetingTitle: true,
            meetingDesc: true,
            startTime: true,
            endTime: true,
            meetingLink: true
          }
        });

        // If meeting exists, send invite
        if (meeting) {
          // Import email service
          const { sendMeetingInvite } = await import('@/lib/email');
          
          await sendMeetingInvite({
            recipient: {
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
              email: user.email
            },
            meetingTitle: meeting.meetingTitle || `GOALETE Meeting ${new Date(meeting.meetingDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
            meetingDescription: meeting.meetingDesc || '',
            meetingLink: meeting.meetingLink || '',
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            platform: meeting.platform
          });
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the whole operation if email fails
      }

      return NextResponse.json({
        message: `User successfully added to ${planType.replace('-', ' ')} subscription`,
        subscription: subscription,
        user: user,
        inviteSent: true
      });

    } else if (action === 'addUserToMeeting') {
      // This section is kept for backward compatibility
      return NextResponse.json({ 
        error: "This action is deprecated. Please use 'createSubscription' instead." 
      }, { status: 400 });

    } else {
      return NextResponse.json({ 
        error: "Invalid action. Use 'checkMeeting' or 'addUserToMeeting'" 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in add-user-to-meeting API:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
