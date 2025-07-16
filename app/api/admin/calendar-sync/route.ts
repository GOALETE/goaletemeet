import { NextRequest, NextResponse } from "next/server";
import { manageMeeting } from "@/lib/meetingLink";
import prisma from "@/lib/prisma";

/**
 * Calendar Sync API Route
 * 
 * Syncs default meeting schedule from environment variables to database
 * for the next specified number of days. Preserves existing user attachments.
 */

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminPasscode = process.env.ADMIN_PASSCODE;

    if (!authHeader || !authHeader.startsWith('Bearer ') || !adminPasscode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== adminPasscode) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const body = await request.json();
    const { days = 30 } = body;

    if (days < 1 || days > 90) {
      return NextResponse.json({ 
        error: 'Days must be between 1 and 90' 
      }, { status: 400 });
    }

    // Get default meeting settings from environment
    const defaultPlatform = process.env.DEFAULT_MEETING_PLATFORM || 'google-meet';
    const defaultTime = process.env.DEFAULT_MEETING_TIME || '21:00';
    const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || '60');
    const defaultTitle = process.env.DEFAULT_MEETING_TITLE || 'GOALETE Club Daily Session';
    const defaultDescription = process.env.DEFAULT_MEETING_DESCRIPTION || 'Join us for a GOALETE Club session to learn how to achieve any goal in life.';

    console.log(`Starting calendar sync for ${days} days with default settings:`, {
      platform: defaultPlatform,
      time: defaultTime,
      duration: defaultDuration,
      title: defaultTitle
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Generate dates for the next N days
    const today = new Date();
    const dates: string[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    console.log(`Processing ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}`);

    // Process each date
    for (const date of dates) {
      try {
        // Check if meeting already exists for this date
        const existingMeeting = await prisma.meeting.findFirst({
          where: {
            meetingDate: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`)
            }
          },
          include: {
            users: true
          }
        });

        if (existingMeeting) {
          // Meeting exists - check if it needs updating to match default schedule
          const [hours, minutes] = defaultTime.split(':').map(Number);
          const expectedStartTime = new Date(`${date}T${defaultTime}:00.000Z`);
          const expectedEndTime = new Date(expectedStartTime);
          expectedEndTime.setMinutes(expectedEndTime.getMinutes() + defaultDuration);

          const needsUpdate = 
            existingMeeting.startTime.getTime() !== expectedStartTime.getTime() ||
            existingMeeting.endTime.getTime() !== expectedEndTime.getTime() ||
            existingMeeting.meetingTitle !== defaultTitle ||
            existingMeeting.meetingDesc !== defaultDescription;

          if (needsUpdate) {
            // Update meeting but preserve user attachments
            await prisma.meeting.update({
              where: { id: existingMeeting.id },
              data: {
                startTime: expectedStartTime,
                endTime: expectedEndTime,
                meetingTitle: defaultTitle,
                meetingDesc: defaultDescription,
                // Preserve existing platform, meetingLink, users, etc.
              }
            });
            updated++;
            console.log(`Updated meeting for ${date} (preserved ${existingMeeting.users.length} user attachments)`);
          } else {
            skipped++;
            console.log(`Skipped ${date} - meeting already matches default schedule`);
          }
        } else {
          // No meeting exists - create new one using manageMeeting
          // Get all users with active subscriptions for this date
          const targetDate = new Date(`${date}T00:00:00.000Z`);
          const activeSubscriptions = await prisma.subscription.findMany({
            where: {
              status: 'active',
              startDate: { lte: targetDate },
              endDate: { gte: targetDate }
            },
            select: { userId: true }
          });
          
          const userIds = activeSubscriptions.map(sub => sub.userId);
          console.log(`Creating meeting for ${date} with ${userIds.length} active users`);

          const meeting = await manageMeeting({
            date,
            platform: defaultPlatform as 'google-meet' | 'zoom',
            startTime: defaultTime,
            duration: defaultDuration,
            meetingTitle: defaultTitle,
            meetingDesc: defaultDescription,
            userIds,
            operation: 'create',
            syncFromCalendar: true
          });

          // Mark as system-generated default meeting
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
              createdBy: 'calendar-sync',
              isDefault: true
            }
          });

          created++;
          console.log(`Created meeting for ${date} with ${userIds.length} users`);
        }
      } catch (error) {
        const errorMsg = `Failed to process ${date}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const summary = {
      processed: dates.length,
      created,
      updated,
      skipped,
      errors: errors.length,
      errorDetails: errors
    };

    console.log('Calendar sync completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Calendar sync completed successfully`,
      ...summary
    });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Calendar sync failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
