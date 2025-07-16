import { NextRequest, NextResponse } from "next/server";
import { getCalendarClient, getAdminEmail } from "@/lib/googleAuth";
import prisma from "@/lib/prisma";

/**
 * Enhanced Calendar Sync API Route
 * 
 * Syncs calendar events containing "goalete" (case-insensitive) with database.
 * Features:
 * - Searches by "goalete" keyword instead of time slots
 * - Handles deleted meetings (removes from DB if not in calendar)
 * - Only updates meeting data, preserves user attachments
 * - Syncs for 30 days by default
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

    console.log(`Starting enhanced calendar sync for ${days} days`);

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Generate date range for sync
    const today = new Date();
    const dates: string[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    console.log(`Processing ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}`);

    // Initialize Google Calendar client
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Process each date
    for (const date of dates) {
      try {
        console.log(`Processing date: ${date}`);
        
        // Get existing meetings in DB for this date
        const existingMeetings = await prisma.meeting.findMany({
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

        // Search Google Calendar for "goalete" events on this date
        const dateObj = new Date(date);
        const timeMin = new Date(dateObj.setHours(0, 0, 0, 0)).toISOString();
        const timeMax = new Date(dateObj.setHours(23, 59, 59, 999)).toISOString();

        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50,
          q: 'goalete' // Search for "goalete" case-insensitive
        });

        const calendarEvents = response.data.items || [];
        console.log(`Found ${calendarEvents.length} calendar events containing "goalete" for ${date}`);

        // Filter events that actually contain "goalete" and have meeting links
        const validCalendarEvents = calendarEvents.filter(event => {
          const eventText = `${event.summary || ''} ${event.description || ''}`.toLowerCase();
          const hasGoaleteKeyword = eventText.includes('goalete');
          const hasMeetingLink = event.conferenceData && 
            event.conferenceData.entryPoints && 
            event.conferenceData.entryPoints.some((entry: any) => entry.entryPointType === 'video');
          
          return hasGoaleteKeyword && hasMeetingLink;
        });

        console.log(`${validCalendarEvents.length} valid goalete events with meeting links for ${date}`);

        // Track which DB meetings have corresponding calendar events
        const matchedMeetingIds = new Set<string>();

        // Process each valid calendar event
        for (const event of validCalendarEvents) {
          const videoEntryPoint = event.conferenceData!.entryPoints!.find(
            (entry: any) => entry.entryPointType === 'video'
          );

          if (!videoEntryPoint || !videoEntryPoint.uri || !event.start || !event.end) {
            continue;
          }

          const startTimeStr = event.start.dateTime || event.start.date;
          const endTimeStr = event.end.dateTime || event.end.date;
          
          if (!startTimeStr || !endTimeStr) continue;

          const startTime = new Date(startTimeStr);
          const endTime = new Date(endTimeStr);

          // Check if meeting already exists in DB (by Google Event ID or time match)
          const existingMeeting = existingMeetings.find(dbMeeting => 
            (dbMeeting.googleEventId && dbMeeting.googleEventId === event.id) ||
            (dbMeeting.startTime.getTime() === startTime.getTime() && 
             dbMeeting.endTime.getTime() === endTime.getTime())
          );

          if (existingMeeting) {
            // Mark as matched
            matchedMeetingIds.add(existingMeeting.id);

            // Check if meeting needs updating (only meeting data, preserve users)
            const needsUpdate = 
              existingMeeting.meetingLink !== videoEntryPoint.uri ||
              existingMeeting.meetingTitle !== (event.summary || existingMeeting.meetingTitle) ||
              existingMeeting.meetingDesc !== (event.description || existingMeeting.meetingDesc) ||
              existingMeeting.googleEventId !== event.id ||
              existingMeeting.startTime.getTime() !== startTime.getTime() ||
              existingMeeting.endTime.getTime() !== endTime.getTime();

            if (needsUpdate) {
              await prisma.meeting.update({
                where: { id: existingMeeting.id },
                data: {
                  meetingLink: videoEntryPoint.uri,
                  meetingTitle: event.summary || existingMeeting.meetingTitle,
                  meetingDesc: event.description || existingMeeting.meetingDesc,
                  googleEventId: event.id,
                  startTime: startTime,
                  endTime: endTime,
                  // Preserve users, createdBy, isDefault, etc.
                }
              });
              updated++;
              console.log(`Updated meeting ${existingMeeting.id} for ${date} (preserved ${existingMeeting.users.length} user attachments)`);
            } else {
              skipped++;
              console.log(`Skipped meeting ${existingMeeting.id} for ${date} - no changes needed`);
            }
          } else {
            // Create new meeting from calendar event
            try {
              const meeting = await prisma.meeting.create({
                data: {
                  meetingDate: new Date(date),
                  platform: 'google-meet',
                  meetingLink: videoEntryPoint.uri,
                  startTime: startTime,
                  endTime: endTime,
                  createdBy: 'calendar-sync',
                  meetingTitle: event.summary || `GOALETE Club Session ${date}`,
                  meetingDesc: event.description || 'GOALETE Club session to learn how to achieve any goal in life.',
                  googleEventId: event.id || undefined,
                  isDefault: false
                }
              });
              
              created++;
              console.log(`Created new meeting ${meeting.id} from calendar event for ${date}`);
            } catch (createError: any) {
              if (createError.code === 'P2002') {
                // Duplicate constraint, skip
                skipped++;
                console.log(`Skipped duplicate meeting creation for ${date}`);
              } else {
                throw createError;
              }
            }
          }
        }

        // Handle deleted meetings: remove DB meetings that don't have corresponding calendar events
        const unMatchedMeetings = existingMeetings.filter(dbMeeting => 
          !matchedMeetingIds.has(dbMeeting.id) && 
          dbMeeting.createdBy === 'calendar-sync' // Only remove calendar-synced meetings
        );

        for (const orphanedMeeting of unMatchedMeetings) {
          // Delete meeting from DB as it no longer exists in calendar
          await prisma.meeting.delete({
            where: { id: orphanedMeeting.id }
          });
          deleted++;
          console.log(`Deleted orphaned meeting ${orphanedMeeting.id} for ${date} (was deleted from calendar)`);
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
      deleted,
      skipped,
      errors: errors.length,
      errorDetails: errors
    };

    console.log('Enhanced calendar sync completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Enhanced calendar sync completed successfully`,
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
