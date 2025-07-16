import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMeetingInvite } from "@/lib/email";
import { createMeetingLink } from "@/lib/meetingLink";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    console.log('🚀 Daily cron job started at:', new Date().toISOString());
    
    // Check if cron jobs are enabled
    if (process.env.ENABLE_CRON_JOBS === 'false') {
      console.log('⚠️ Cron jobs are disabled via ENABLE_CRON_JOBS environment variable');
      return NextResponse.json({ 
        message: "Cron jobs are disabled",
        status: "disabled",
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    // Verify cron job authentication (Vercel provides a special header)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, verify it; otherwise allow the request (for Vercel's built-in cron)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized cron job request');
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get today's date in IST
    const today = new Date();
    const istDate = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStr = format(istDate, 'yyyy-MM-dd');
    
    console.log(`📅 Processing invites for date: ${todayStr} (IST)`);

    // Find all users with active subscriptions for today
    const usersWithActiveSubscriptions = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: {
            AND: [
              {
                startDate: {
                  lte: istDate
                }
              },
              {
                endDate: {
                  gte: istDate
                }
              },
              {
                status: 'active'
              },
              {
                OR: [
                  { paymentStatus: 'completed' },
                  { paymentStatus: 'paid' },
                  { paymentStatus: 'success' },
                  { paymentStatus: 'admin-added' },
                  { paymentStatus: 'admin-created' },
                  { paymentStatus: '' }
                ]
              }
            ]
          }
        }
      },
      include: {
        subscriptions: {
          where: {
            AND: [
              {
                startDate: {
                  lte: istDate
                }
              },
              {
                endDate: {
                  gte: istDate
                }
              },
              {
                status: 'active'
              }
            ]
          }
        }
      }
    });

    console.log(`👥 Found ${usersWithActiveSubscriptions.length} users with active subscriptions for today`);

    if (usersWithActiveSubscriptions.length === 0) {
      console.log('✅ No users with active subscriptions for today. Cron job completed.');
      return NextResponse.json({
        message: "No users with active subscriptions for today",
        date: todayStr,
        timestamp: new Date().toISOString(),
        usersProcessed: 0
      });
    }

    // Check if there's already a meeting for today
    let todayMeeting = await prisma.meeting.findFirst({
      where: {
        meetingDate: new Date(todayStr)
      }
    });

    // If no meeting exists for today, create one
    if (!todayMeeting) {
      console.log('🎯 No meeting found for today, creating new meeting...');
      
      // Create meeting link using the correct function signature
      const meetingLink = await createMeetingLink({
        platform: 'google-meet',
        date: todayStr,
        startTime: '09:00',
        duration: 60, // 1 hour
        meetingTitle: `Daily Meeting - ${format(istDate, 'MMMM dd, yyyy')}`,
        meetingDesc: `Daily meeting for Goalete subscribers on ${format(istDate, 'EEEE, MMMM dd, yyyy')}`
      });

      // Create meeting record in database
      const startDateTime = new Date(`${todayStr}T09:00:00+05:30`); // 9 AM IST
      const endDateTime = new Date(`${todayStr}T10:00:00+05:30`);   // 10 AM IST

      todayMeeting = await prisma.meeting.create({
        data: {
          meetingDate: new Date(todayStr),
          platform: 'google',
          meetingLink: meetingLink,
          startTime: startDateTime,
          endTime: endDateTime,
          meetingTitle: `Daily Meeting - ${format(istDate, 'MMM dd, yyyy')}`,
          meetingDesc: `Daily meeting for Goalete subscribers`,
          createdBy: 'cron-job',
          isDefault: false
        }
      });

      console.log(`✅ Created new meeting for ${todayStr}: ${todayMeeting.id}`);
    } else {
      console.log(`📋 Meeting already exists for ${todayStr}: ${todayMeeting.id}`);
    }

    // Send invites to all eligible users
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of usersWithActiveSubscriptions) {
      try {
        console.log(`📧 Sending invite to: ${user.email}`);
        
        const inviteResult = await sendMeetingInvite({
          recipient: {
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email
          },
          meetingTitle: todayMeeting.meetingTitle,
          meetingDescription: todayMeeting.meetingDesc || 'Daily meeting for Goalete subscribers',
          meetingLink: todayMeeting.meetingLink,
          startTime: todayMeeting.startTime,
          endTime: todayMeeting.endTime,
          platform: todayMeeting.platform
        });

        if (inviteResult) {
          successCount++;
          console.log(`✅ Successfully sent invite to: ${user.email}`);
        } else {
          errorCount++;
          const error = `Failed to send invite to ${user.email}`;
          errors.push(error);
          console.error(`❌ ${error}`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Exception sending invite to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    const summary = {
      message: "Daily cron job completed",
      date: todayStr,
      timestamp: new Date().toISOString(),
      meetingId: todayMeeting.id,
      meetingLink: todayMeeting.meetingLink,
      totalUsers: usersWithActiveSubscriptions.length,
      successfulInvites: successCount,
      failedInvites: errorCount,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('🎉 Daily cron job completed:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error("❌ Error in daily cron job:", error);
    return NextResponse.json(
      {
        error: "Failed to execute daily cron job",
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(req: NextRequest) {
  return GET(req);
}
