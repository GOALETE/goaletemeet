import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for adding user to meeting
const addUserToMeetingSchema = z.object({
  userId: z.string(),
  meetingId: z.string(),
  sendInvite: z.boolean().optional().default(true)
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

    } else if (action === 'addUserToMeeting') {
      // Add user to existing meeting
      const parsed = addUserToMeetingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ 
          error: "Invalid request", 
          details: parsed.error.errors 
        }, { status: 400 });
      }

      const { userId, meetingId, sendInvite } = parsed.data;

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

      // Verify meeting exists
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
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

      if (!meeting) {
        return NextResponse.json({ 
          error: "Meeting not found" 
        }, { status: 404 });
      }

      // Check if user already has a subscription for this meeting date
      const meetingDate = new Date(meeting.meetingDate);
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId: userId,
          startDate: { lte: meetingDate },
          endDate: { gte: meetingDate },
          status: 'active'
        }
      });

      if (existingSubscription) {
        return NextResponse.json({ 
          message: "User already has access to this meeting through existing subscription",
          subscription: existingSubscription,
          user: user,
          meeting: meeting
        });
      }

      // Create a single-day subscription for this meeting
      const subscription = await prisma.subscription.create({
        data: {
          userId: userId,
          planType: 'admin-added',
          startDate: meetingDate,
          endDate: meetingDate,
          status: 'active',
          paymentStatus: 'admin-added',
          duration: 1,
          price: 0,
          orderId: `admin-${Date.now()}-${userId.slice(-6)}`
        }
      });

      // Send invitation email if requested
      if (sendInvite) {
        try {
          // Import email service
          const { sendMeetingInvite } = await import('@/lib/email');
          
          await sendMeetingInvite({
            recipient: {
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
              email: user.email
            },
            meetingTitle: meeting.meetingTitle || 'GOALETE Meeting',
            meetingDescription: meeting.meetingDesc || '',
            meetingLink: meeting.meetingLink || '',
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            platform: meeting.platform
          });
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      return NextResponse.json({
        message: "User successfully added to meeting",
        subscription: subscription,
        user: user,
        meeting: meeting,
        inviteSent: sendInvite
      });

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
