import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    // Check if cron jobs are enabled
    const cronEnabled = process.env.ENABLE_CRON_JOBS !== 'false';
    
    // Get today's date in IST
    const today = new Date();
    const istDate = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStr = format(istDate, 'yyyy-MM-dd');

    // Check if there's a meeting for today
    const todayMeeting = await prisma.meeting.findFirst({
      where: {
        meetingDate: new Date(todayStr)
      }
    });

    // Count users with active subscriptions for today
    const activeUsersCount = await prisma.user.count({
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
      }
    });

    // Get recent meetings (last 7 days) to show activity
    const recentMeetings = await prisma.meeting.findMany({
      where: {
        meetingDate: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7))
        }
      },
      orderBy: {
        meetingDate: 'desc'
      },
      take: 10
    });

    const status = {
      cronEnabled,
      currentTime: new Date().toISOString(),
      currentTimeIST: istDate.toISOString(),
      todayDate: todayStr,
      todayMeeting: todayMeeting ? {
        id: todayMeeting.id,
        title: todayMeeting.meetingTitle,
        platform: todayMeeting.platform,
        startTime: todayMeeting.startTime,
        endTime: todayMeeting.endTime,
        createdBy: todayMeeting.createdBy,
        createdAt: todayMeeting.createdAt
      } : null,
      activeUsersForToday: activeUsersCount,
      recentMeetings: recentMeetings.map(meeting => ({
        id: meeting.id,
        date: format(meeting.meetingDate, 'yyyy-MM-dd'),
        title: meeting.meetingTitle,
        platform: meeting.platform,
        createdBy: meeting.createdBy,
        createdAt: meeting.createdAt
      })),
      nextCronExecution: "Daily at 8:00 AM IST (2:30 AM UTC)",
      environment: {
        ENABLE_CRON_JOBS: process.env.ENABLE_CRON_JOBS || 'undefined',
        CRON_SECRET: process.env.CRON_SECRET ? '***SET***' : 'undefined',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL ? '***SET***' : 'undefined',
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '***SET***' : 'undefined'
      }
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error("Error checking cron status:", error);
    return NextResponse.json(
      {
        error: "Failed to check cron status",
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
