import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMeetingInvite } from "@/lib/email";
import { manageMeeting } from "@/lib/meetingLink";
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

    // Check if there's already a meeting for today - we'll use manageMeeting to handle this
    // Get active users for today first
    const activeUsers = await prisma.user.findMany({
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    const activeUserIds = activeUsers.map(user => user.id);
    console.log(`👥 Found ${activeUsers.length} users with active subscriptions for today`);

    if (activeUsers.length === 0) {
      console.log('✅ No users with active subscriptions for today. Cron job completed.');
      return NextResponse.json({
        message: "No users with active subscriptions for today",
        date: todayStr,
        timestamp: new Date().toISOString(),
        usersProcessed: 0
      });
    }

    // Use .env or fallback values
    let platform: 'google-meet' | 'zoom' = 'google-meet';
    if (process.env.DEFAULT_MEETING_PLATFORM === 'zoom') platform = 'zoom';
    else if (process.env.DEFAULT_MEETING_PLATFORM === 'google-meet') platform = 'google-meet';
    const startTimeStr = process.env.DEFAULT_MEETING_TIME || '21:00';
    const durationMin = process.env.DEFAULT_MEETING_DURATION ? Number(process.env.DEFAULT_MEETING_DURATION) : 60;
    const meetingTitle = process.env.DEFAULT_MEETING_TITLE || `Daily Meeting - ${format(istDate, 'dd-MM-yy')}`;
    const meetingDesc = process.env.DEFAULT_MEETING_DESCRIPTION || `Daily meeting for Goalete subscribers on ${format(istDate, 'EEEE, dd-MM-yy')}`;

    // Create or get meeting and add active users using the meeting management API
    console.log('🎯 Creating/updating meeting with active users...');
    const todayMeeting = await manageMeeting({
      date: todayStr,
      platform,
      startTime: startTimeStr,
      duration: durationMin,
      meetingTitle,
      meetingDesc,
      userIds: activeUserIds,
      operation: 'getOrCreate',
      syncFromCalendar: false
    });

    console.log(`✅ Meeting ready for ${todayStr}: ${todayMeeting.id} with ${todayMeeting.users?.length || 0} users`);

    // Send invites to all active users
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of activeUsers) {
      try {
        console.log(`📧 Sending invite to: ${user.email}`);
        
        const inviteResult = await sendMeetingInvite({
          recipient: {
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email
          },
          meetingTitle: `${todayMeeting.meetingTitle} - ${format(istDate, 'dd-MM-yy')}` || `${process.env.DEFAULT_MEETING_TITLE}- ${format(istDate, 'dd-MM-yy')}` || `Daily Meeting - ${format(istDate, 'dd-MM-yy')}`,
          meetingDescription: todayMeeting.meetingDesc || process.env.DEFAULT_MEETING_DESCRIPTION || 'Daily meeting for Goalete subscribers',
          meetingLink: todayMeeting.meetingLink,
          startTime: todayMeeting.startTime,
          endTime: todayMeeting.endTime,
          platform: todayMeeting.platform || process.env.DEFAULT_MEETING_PLATFORM || 'google-meet'
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
      totalUsers: activeUsers.length,
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
