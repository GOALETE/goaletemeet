import prisma from './prisma';
import axios from 'axios';
import { google } from 'googleapis';
import { format } from 'date-fns';
import { MeetingWithUsers } from '../types/meeting';
import { getCalendarClient, getAuthenticatedJWT, getAdminEmail } from './googleAuth';

/**
 * Enhanced error handling for the Google API calls
 */
interface ApiError extends Error {
  code?: string | number;
  response?: {
    status?: number;
    data?: any;
  };
}

/**
 * Gets special email addresses that should be included in every meeting
 * These emails are set in the SPECIAL_EMAILS environment variable as a comma-separated list
 * @returns Array of email addresses
 */
export function getSpecialEmails(): string[] {
  const specialEmailsStr = process.env.SPECIAL_EMAILS || '';
  if (!specialEmailsStr) return [];
  
  return specialEmailsStr.split(',').map(email => email.trim()).filter(email => email !== '');
}

/**
 * Create a meeting link for the given platform, date, and timeslot.
 * This is a simple function that only returns the URL string.
 * For more functionality use createMeeting or other higher-level functions.
 * @param platform 'google-meet' | 'zoom'
 * @param date ISO date string (YYYY-MM-DD)
 * @param startTime string (HH:MM, 24-hour format)
 * @param duration number (minutes)
 * @param meetingTitle optional title for the meeting
 * @param meetingDesc optional description for the meeting
 * @returns Promise<string> meeting link
 */
export async function createMeetingLink({
  platform,
  date,
  startTime,
  duration,
  meetingTitle,
  meetingDesc
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number,
  meetingTitle?: string,
  meetingDesc?: string
}): Promise<string> {
  if (platform === 'google-meet') {
    const { join_url } = await google_create_meet({ date, startTime, duration, meetingTitle, meetingDesc });
    return join_url;
  } else if (platform === 'zoom') {
    const { join_url } = await zoom_create_meet({ date, startTime, duration, meetingTitle, meetingDesc });
    return join_url;
  } else {
    throw new Error('Unsupported platform');
  }
}

// Enhanced Google Meet creation with proper conference data following Google Calendar API guidelines
export async function google_create_meet({ 
  date, 
  startTime, 
  duration,
  meetingTitle,
  meetingDesc
}: { 
  date: string, 
  startTime: string, 
  duration: number,
  meetingTitle?: string,
  meetingDesc?: string
}): Promise<{ join_url: string, id: string }> {
  try {
    // Get configuration from environment or defaults
    const dateString = format(new Date(date), 'dd-MM-yy');
    const finalMeetingTitle = meetingTitle 
      ? `${meetingTitle} ${dateString}` 
      : process.env.DEFAULT_MEETING_TITLE 
        ? `${process.env.DEFAULT_MEETING_TITLE} ${dateString}` 
        : `GOALETE Club Session ${dateString}`;
    const finalMeetingDesc = meetingDesc || process.env.DEFAULT_MEETING_DESCRIPTION || 'Join us for a GOALETE Club session to learn how to achieve any goal in life.';
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    console.log(`Creating Google Meet for date: ${date}, time: ${startTime}, duration: ${duration} minutes`);
    console.log(`Using calendar ID: ${calendarId}`);

    // Use service account authentication with Domain-Wide Delegation
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);

    // Create timezone-aware datetime objects
    const IST_TIMEZONE = 'Asia/Kolkata';
    
    // Parse the input time as IST and create proper Date objects
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Create IST datetime string and parse it correctly
    const istDateTimeString = `${date}T${startTime}:00.000+05:30`;
    const istDateTime = new Date(istDateTimeString);
    
    // For Google Calendar, we need the IST time
    const endDateTime = new Date(istDateTime.getTime() + (duration * 60 * 1000));

    // Generate a unique request ID for conference creation following Google guidelines
    const conferenceRequestId = `goalete-meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Conference request ID: ${conferenceRequestId}`);

    // Create event following Google Calendar API v3 specification
    let event: any = null;
    
    try {
      // Create event with proper Google Meet conference data
      event = await calendar.events.insert({
        calendarId: calendarId,
        conferenceDataVersion: 1, // Required for Google Meet integration per API docs
        sendUpdates: 'none', // Don't send emails during creation (users added later)
        requestBody: {
          // Required fields per API documentation
          summary: finalMeetingTitle,
          start: { 
            dateTime: istDateTime.toISOString(), 
            timeZone: IST_TIMEZONE
          },
          end: { 
            dateTime: endDateTime.toISOString(), 
            timeZone: IST_TIMEZONE
          },
          
          // Optional but recommended fields
          description: finalMeetingDesc,
          location: 'Google Meet (Online)',
          status: 'confirmed',
          
          // Conference data creation following Google Calendar API v3 specification
          conferenceData: {
            createRequest: {
              requestId: conferenceRequestId,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          },
          
          // Security and access control settings
          visibility: 'private', // Event is private to organization
          guestsCanInviteOthers: false, // Prevent unauthorized invitations
          guestsCanModify: false, // Prevent event modifications by guests
          guestsCanSeeOtherGuests: true, // Allow attendees to see each other (required for meetings)
          anyoneCanAddSelf: false, // Prevent unauthorized self-addition
          
          // Notification settings
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 }, // 1 hour before
              { method: 'email', minutes: 15 }  // 15 minutes before
            ]
          },
          
          // Calendar display settings
          transparency: 'opaque', // Event blocks time on calendar
          
          // Extended properties for tracking and security (optional)
          extendedProperties: {
            private: {
              'securityLevel': 'invite-only-strict',
              'meetingType': 'subscription-based',
              'createdBy': 'goalete-service-account',
              'version': '5.0',
              'authMethod': 'service-account',
              'crossDomainEnabled': 'true',
              'timezone': IST_TIMEZONE,
              'conferenceRequestId': conferenceRequestId,
              'createdAt': new Date().toISOString(),
              'platform': 'google-meet',
              'accessControl': 'restricted-invite-only'
            },
            shared: {
              'platform': 'goalete',
              'eventSource': 'automated-system',
              'supportsExternalDomains': 'true',
              'securityLevel': 'high'
            }
          }
        }
      });
    } catch (conferenceError) {
      console.log('ERROR: Conference data creation failed, trying fallback method:', 
        conferenceError instanceof Error ? conferenceError.message : String(conferenceError));
      
      // Fallback: Create event without explicit conference data - Google will auto-generate hangoutLink
      event = await calendar.events.insert({
        calendarId: calendarId,
        sendUpdates: 'none',
        requestBody: {
          // Required fields
          summary: finalMeetingTitle,
          start: { 
            dateTime: istDateTime.toISOString(), 
            timeZone: IST_TIMEZONE
          },
          end: { 
            dateTime: endDateTime.toISOString(), 
            timeZone: IST_TIMEZONE
          },
          
          // Optional fields
          description: `${finalMeetingDesc}\n\nGoogle Meet link will be generated automatically.`,
          location: 'Google Meet (Online)',
          status: 'confirmed',
          
          // Security settings (maintained in fallback)
          visibility: 'private',
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          guestsCanSeeOtherGuests: true,
          anyoneCanAddSelf: false,
          
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'email', minutes: 15 }
            ]
          },
          
          transparency: 'opaque',
          
          extendedProperties: {
            private: {
              'goaleTeApp': 'true',
              'securityLevel': 'invite-only-strict',
              'meetingType': 'subscription-based',
              'createdBy': 'goalete-service-account',
              'version': '5.0',
              'authMethod': 'service-account',
              'crossDomainEnabled': 'true',
              'timezone': IST_TIMEZONE,
              'createdAt': new Date().toISOString(),
              'platform': 'google-meet',
              'accessControl': 'restricted-invite-only',
              'conferenceMethod': 'fallback-hangout'
            },
            shared: {
              'platform': 'goalete',
              'eventSource': 'automated-system',
              'supportsExternalDomains': 'true',
              'securityLevel': 'high'
            }
          }
        }
      });
    }

    if (!event) {
      throw new Error('Google Calendar API returned empty response');
    }

    // Extract event data from response
    const calendarEvent = event.data;
    const createdEventId = calendarEvent.id;
    
    if (!createdEventId) {
      throw new Error('Failed to create Google Calendar event: No event ID returned');
    }
  
    // Extract Google Meet link from conference data (preferred method)
    let join_url = '';
    const conferenceData = calendarEvent.conferenceData;
    
    if (conferenceData && conferenceData.entryPoints) {
      // Find video entry point (Google Meet link)
      const videoEntryPoint = conferenceData.entryPoints.find(
        (entry: any) => entry.entryPointType === 'video'
      );
      
      if (videoEntryPoint && videoEntryPoint.uri) {
        join_url = videoEntryPoint.uri;
        console.log(`Google Meet link generated from conference data: ${join_url}`);
      }
    }
    
    // Fallback to hangoutLink if conference data not available
    if (!join_url && calendarEvent.hangoutLink) {
      join_url = calendarEvent.hangoutLink;
      console.log(`Using hangoutLink as fallback: ${join_url}`);
    }
    
    // If no meeting link available immediately, store a placeholder for later update
    if (!join_url) {
      console.warn('No Google Meet link available immediately - conference creation might be pending');
      join_url = 'pending-meet-link-creation';
    }
    
    console.log(`✅ Successfully created Google Calendar event with ID: ${createdEventId}`);
    console.log(`📅 Event URL: ${calendarEvent.htmlLink || 'Not available'}`);
    console.log(`🔗 Meeting URL: ${join_url}`);
    console.log(`🎯 Conference status: ${conferenceData?.createRequest?.status || conferenceData?.status || 'auto-generated'}`);
    
    return { join_url, id: createdEventId };
    
  } catch (eventError) {
    console.error('❌ Google Calendar event creation failed:', eventError);
    const apiError = eventError as ApiError;
    
    // Enhanced error handling with specific Google Calendar API error codes
    if (apiError.response?.status === 403) {
      throw new Error('Google Calendar access denied. Verify service account has Calendar API access and proper calendar permissions.');
    } else if (apiError.response?.status === 401) {
      throw new Error('Google Calendar authentication failed. Check service account credentials and ensure proper authentication setup.');
    } else if (apiError.response?.status === 400) {
      const errorMsg = apiError.response?.data?.error?.message || 'Invalid request parameters';
      console.error('Bad request details:', apiError.response?.data?.error?.details);
      throw new Error(`Google Calendar bad request: ${errorMsg}`);
    } else if (apiError.response?.status === 409) {
      throw new Error('Event creation conflict. A conflicting event may already exist at this time.');
    } else if (apiError.response?.status === 404) {
      throw new Error('Calendar not found. Verify the calendar ID exists and is accessible.');
    } else {
      throw new Error(`Google Calendar event creation failed: ${apiError.message || 'Unknown error'}`);
    }
  }
}

// Credit-optimized function to add a single user using patch (most efficient for minimal updates)
export async function google_add_user_to_meeting(eventId: string, email: string, name?: string): Promise<void> {
  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Step 1: Get current event attendees only (minimal fields for efficiency)
    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId,
      fields: 'attendees'
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const attendees = event.data.attendees || [];
    
    // Quick check if user is already an attendee (avoid unnecessary API call)
    const existingAttendee = attendees.find((attendee: any) => attendee.email === email);
    if (existingAttendee) {
      console.log(`User ${email} is already an attendee of event ${eventId}`);
      return;
    }

    // Step 2: Prepare new attendee
    const newAttendee = { 
      email, 
      displayName: name || email.split('@')[0],
      responseStatus: 'accepted' as const, // Auto-accept for seamless experience
      additionalGuests: 0, // Security: prevent additional guests
      optional: false // Required attendance
    };
    
    const updatedAttendees = [...attendees, newAttendee];

    // Step 3: Use patch for partial update (most credit-efficient for single field updates)
    await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      sendUpdates: 'externalOnly', // Cross-domain support: send to external domains only
      requestBody: {
        // Only update attendees field - patch is most efficient for partial updates
        attendees: updatedAttendees
      }
    });

    console.log(`✅ Credit-optimized: Added ${email} to event ${eventId} (patch method)`);
    console.log(`📊 API efficiency: 2 quota units (1 get + 1 patch) - most efficient for single user`);
  } catch (error) {
    console.error(`Error adding user ${email} to Google Calendar event ${eventId}:`, error);
    throw new Error(`Failed to add user to Google Calendar event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Credit-optimized batch function using get + patch (most efficient for attendee updates)
export async function google_add_users_to_meeting(eventId: string, users: { email: string, name?: string }[]): Promise<void> {
  if (users.length === 0) {
    console.log('No users to add to meeting');
    return;
  }

  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Step 1: Get current attendees only (minimal fields for maximum efficiency)
    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId,
      fields: 'attendees' // Only fetch attendees to minimize data transfer
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const existingAttendees = event.data.attendees || [];
    const existingEmails = new Set(existingAttendees.map((attendee: any) => attendee.email));
    
    // Filter out users who are already attendees (optimization to avoid API overhead)
    const newUsers = users.filter(user => !existingEmails.has(user.email));
    
    if (newUsers.length === 0) {
      console.log('All users are already attendees of the event');
      return;
    }

    // Step 2: Prepare new attendees with cross-domain security settings
    const newAttendees = newUsers.map(user => ({
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      responseStatus: 'accepted' as const, // Auto-accept for seamless experience
      additionalGuests: 0, // Prevent additional guests for security
      comment: '', // No special comments
      optional: false // Required attendance
    }));

    const updatedAttendees = [...existingAttendees, ...newAttendees];

    // Analyze domains for cross-domain tracking
    const domainAnalysis = newUsers.reduce((acc, user) => {
      const domain = user.email.split('@')[1] || 'unknown';
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const domainBreakdown = Object.entries(domainAnalysis)
      .map(([domain, count]) => `${domain}:${count}`)
      .join(';');

    // Step 3: Use patch for attendee-only update (most credit-efficient approach)
    await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      sendUpdates: 'externalOnly', // Critical for cross-domain invites - sends to external domains
      requestBody: {
        // Only update attendees field - patch is most efficient for partial updates
        attendees: updatedAttendees
      }
    });

    console.log(`✅ Credit-optimized batch: Added ${newUsers.length} users to event ${eventId} with auto-acceptance`);
    console.log(`📊 API efficiency: 2 quota units (1 get + 1 patch) for ${newUsers.length} users - optimal approach`);
    console.log(`Domain breakdown: ${domainBreakdown}`);
  } catch (error) {
    console.error(`Error adding users to Google Calendar event ${eventId}:`, error);
    throw new Error(`Failed to add users to Google Calendar event: ${error instanceof Error ? error.message : String(error)}`);
  }
}


async function get_zoom_token(): Promise<string> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;

  if (!clientId || !clientSecret || !accountId) {
    throw new Error('Zoom API credentials are not set (CLIENT_ID, CLIENT_SECRET, ACCOUNT_ID)');
  }

  const base64String = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;

  try {
    const response = await axios.post(url, null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + base64String
      }
    });

    return response.data.access_token;
  } catch (error: any) {
    console.error('Error getting Zoom token:', error.response?.data || error.message);
    throw new Error('Failed to get Zoom access token');
  }
}

export async function zoom_create_meet({ 
  date, 
  startTime, 
  duration,
  meetingTitle,
  meetingDesc
}: { 
  date: string, 
  startTime: string, 
  duration: number,
  meetingTitle?: string,
  meetingDesc?: string
}): Promise<{ join_url: string, id: string, start_url: string }> {
  const ZOOM_USER_ID = process.env.ZOOM_USER_ID;
  
  if (!ZOOM_USER_ID) {
    throw new Error('Zoom User ID is not set');
  }
  
  // Get access token
  const accessToken = await get_zoom_token();
  
  // Construct start time - parse IST input and convert to UTC for Zoom API
  const istDateTimeString = `${date}T${startTime}:00.000+05:30`;
  const istDateTime = new Date(istDateTimeString);
  const startTimeUTC = istDateTime.toISOString();

  // Format date for meeting title
  const dateString = format(new Date(date), 'dd-MM-yy');
  const finalMeetingTitle = meetingTitle 
    ? `${meetingTitle} ${dateString}` 
    : process.env.DEFAULT_MEETING_TITLE 
      ? `${process.env.DEFAULT_MEETING_TITLE} ${dateString}` 
      : `GOALETE Club Session ${dateString}`;
  const finalMeetingDesc = meetingDesc || process.env.DEFAULT_MEETING_DESCRIPTION || 'Join us for a GOALETE Club session to learn how to achieve any goal in life.';

  const meetingConfig = {
    topic: finalMeetingTitle,
    type: 2, // Scheduled meeting
    start_time: startTimeUTC,
    duration: duration, // in minutes
    timezone: 'Asia/Kolkata',
    agenda: finalMeetingDesc,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      approval_type: 0,
      registration_type: 1
    }
  };
  try {
    const response = await axios.post(
      `https://api.zoom.us/v2/users/${ZOOM_USER_ID}/meetings`,
      meetingConfig,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { 
      join_url: response.data.join_url, 
      id: response.data.id,
      start_url: response.data.start_url 
    };
  } catch (error: any) {
    console.error('Zoom API error:', error.response?.data || error.message);
    throw new Error('Failed to create Zoom meeting');
  }
}

/**
 * STREAMLINED MEETING MANAGEMENT SYSTEM
 * This replaces multiple redundant functions with a unified approach
 */

/**
 * Core unified function for all meeting operations
 * Handles: creation, retrieval, calendar sync, user management
 * @param options Meeting operation configuration
 * @returns Meeting record with users
 */
export async function manageMeeting({
  date,
  platform = 'google-meet',
  startTime = '21:00',
  duration = 60,
  meetingTitle,
  meetingDesc,
  userIds = [],
  operation = 'getOrCreate',
  syncFromCalendar = true
}: {
  date: string;
  platform?: 'google-meet' | 'zoom';
  startTime?: string;
  duration?: number;
  meetingTitle?: string;
  meetingDesc?: string;
  userIds?: string[];
  operation?: 'getOrCreate' | 'create' | 'get';
  syncFromCalendar?: boolean;
}): Promise<MeetingWithUsers> {
  const dateObj = new Date(date);
  
  // Step 1: Try to find existing meeting in database
  let existingMeeting = await prisma.meeting.findFirst({
    where: {
      meetingDate: {
        gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        lt: new Date(dateObj.setHours(23, 59, 59, 999))
      }
    },
    include: { users: true },
    orderBy: { createdAt: 'desc' }
  }) as MeetingWithUsers | null;

  // Step 2: If no database meeting and sync enabled, check Google Calendar
  if (!existingMeeting && syncFromCalendar && operation !== 'create') {
    console.log(`No meeting found in database for ${date}, checking Google Calendar`);
    existingMeeting = await syncCalendarEvent(date);
  }

  // Step 3: Handle based on operation type
  switch (operation) {
    case 'get':
      if (!existingMeeting) {
        throw new Error(`No meeting found for date ${date}`);
      }
      return await addUsersToMeeting(existingMeeting, userIds);

    case 'create':
      if (existingMeeting) {
        throw new Error(`Meeting already exists for date ${date}`);
      }
      return await createNewMeeting({
        date, platform, startTime, duration, meetingTitle, meetingDesc, userIds
      });

    case 'getOrCreate':
    default:
      if (existingMeeting) {
        return await addUsersToMeeting(existingMeeting, userIds);
      }
      return await createNewMeeting({
        date, platform, startTime, duration, meetingTitle, meetingDesc, userIds
      });
  }
}

/**
 * Internal function: Create new meeting with platform integration
 */
async function createNewMeeting({
  date, platform, startTime, duration, meetingTitle, meetingDesc, userIds
}: {
  date: string;
  platform: 'google-meet' | 'zoom';
  startTime: string;
  duration: number;
  meetingTitle?: string;
  meetingDesc?: string;
  userIds: string[];
}): Promise<MeetingWithUsers> {
  const finalTitle = meetingTitle || getDefaultMeetingTitle(date);
  const finalDesc = meetingDesc || getDefaultMeetingDescription();
  
  // Create platform meeting
  let meetingLink = '';
  let googleEventId: string | undefined;
  let zoomMeetingId: string | undefined;
  let zoomStartUrl: string | undefined;

  if (platform === 'google-meet') {
    const { join_url, id } = await google_create_meet({ 
      date, startTime, duration,
      meetingTitle: finalTitle,
      meetingDesc: finalDesc
    });
    meetingLink = join_url;
    googleEventId = id;
  } else if (platform === 'zoom') {
    const response = await zoom_create_meet({ 
      date, startTime, duration,
      meetingTitle: finalTitle,
      meetingDesc: finalDesc
    });
    meetingLink = response.join_url;
    zoomMeetingId = response.id?.toString();
    zoomStartUrl = response.start_url;
  }

  // Create database record
  const istDateTime = new Date(`${date}T${startTime}:00.000+05:30`);
  const endDateTime = new Date(istDateTime.getTime() + (duration * 60 * 1000));
  
  const meeting = await prisma.meeting.create({
    data: {
      meetingDate: new Date(date),
      platform,
      meetingLink,
      startTime: istDateTime,
      endTime: endDateTime,
      createdBy: 'system',
      meetingTitle: finalTitle,
      meetingDesc: finalDesc,
      googleEventId,
      zoomMeetingId,
      zoomStartUrl,
      isDefault: false
    },
    include: { users: true }
  });

  console.log(`Created ${platform} meeting for ${date} with ID: ${meeting.id}`);
  
  // Add users if provided
  if (userIds.length > 0) {
    return await addUsersToMeeting(meeting, userIds);
  }
  
  return meeting;
}

/**
 * Internal function: Add users to existing meeting
 */
async function addUsersToMeeting(
  meeting: MeetingWithUsers, 
  userIds: string[]
): Promise<MeetingWithUsers> {
  if (userIds.length === 0) {
    return meeting;
  }

  // Filter out users already in meeting
  const existingUserIds = new Set(meeting.users?.map(user => user.id) || []);
  const newUserIds = userIds.filter(id => !existingUserIds.has(id));
  
  if (newUserIds.length === 0) {
    console.log('All users are already in the meeting');
    return meeting;
  }

  // Get user details
  const newUsers = await prisma.user.findMany({
    where: { id: { in: newUserIds } },
    select: { id: true, email: true, firstName: true, lastName: true }
  });

  if (newUsers.length === 0) {
    return meeting;
  }

  // Add to platform
  try {
    const usersForPlatform = newUsers
      .filter(user => user.email)
      .map(user => ({
        email: user.email,
        name: user.firstName 
          ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) 
          : user.email.split('@')[0]
      }));

    if (meeting.platform === 'google-meet' && meeting.googleEventId && usersForPlatform.length > 0) {
      await google_add_users_to_meeting(meeting.googleEventId, usersForPlatform);
    } else if (meeting.platform === 'zoom' && meeting.zoomMeetingId && usersForPlatform.length > 0) {
      for (const user of usersForPlatform) {
        try {
          await zoom_add_user_to_meeting(meeting.zoomMeetingId!, user.email, user.name);
        } catch (error) {
          console.error(`Error adding ${user.email} to Zoom meeting:`, error);
        }
      }
    }
  } catch (platformError) {
    console.error('Error adding users to platform meeting:', platformError);
  }

  // Update database
  const updatedMeeting = await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      users: {
        connect: newUsers.map(user => ({ id: user.id }))
      }
    },
    include: { users: true }
  });

  console.log(`Added ${newUsers.length} users to meeting ${meeting.id}`);
  return updatedMeeting;
}

/**
 * Internal function: Sync existing calendar event to database
 */
async function syncCalendarEvent(date: string): Promise<MeetingWithUsers | null> {
  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    const dateObj = new Date(date);
    const timeMin = new Date(dateObj.setHours(0, 0, 0, 0)).toISOString();
    const timeMax = new Date(dateObj.setHours(23, 59, 59, 999)).toISOString();
    
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50, // Increased to catch more events
      q: 'goalete' // Search for "goalete" case-insensitive
    });
    
    const events = response.data.items || [];
    console.log(`Found ${events.length} calendar events containing "goalete" for ${date}`);
    
    // Look for events with Google Meet conference data and "goalete" in title/description
    for (const event of events) {
      // Check if event contains "goalete" (case insensitive)
      const eventText = `${event.summary || ''} ${event.description || ''}`.toLowerCase();
      if (!eventText.includes('goalete')) {
        continue;
      }
      
      if (event.conferenceData && event.conferenceData.entryPoints) {
        const videoEntryPoint = event.conferenceData.entryPoints.find(
          (entry: any) => entry.entryPointType === 'video'
        );
        
        if (videoEntryPoint && videoEntryPoint.uri && event.start && event.end) {
          const startTimeStr = event.start.dateTime || event.start.date;
          const endTimeStr = event.end.dateTime || event.end.date;
          
          if (!startTimeStr || !endTimeStr) continue;
          
          console.log(`Syncing calendar event ${event.id} with meeting link`);
          
          try {
            const meeting = await prisma.meeting.create({
              data: {
                meetingDate: new Date(date),
                platform: 'google-meet',
                meetingLink: videoEntryPoint.uri,
                startTime: new Date(startTimeStr),
                endTime: new Date(endTimeStr),
                createdBy: 'calendar-sync',
                meetingTitle: event.summary || getDefaultMeetingTitle(date),
                meetingDesc: event.description || getDefaultMeetingDescription(),
                googleEventId: event.id || undefined,
                isDefault: false
              },
              include: { users: true }
            });
            
            console.log(`Synced calendar event to database as meeting ${meeting.id}`);
            return meeting;
          } catch (dbError: any) {
            if (dbError.code === 'P2002') {
              // Meeting already exists, fetch it
              return await prisma.meeting.findFirst({
                where: {
                  meetingDate: {
                    gte: new Date(date + 'T00:00:00.000Z'),
                    lt: new Date(date + 'T23:59:59.999Z')
                  }
                },
                include: { users: true },
                orderBy: { createdAt: 'desc' }
              });
            }
            throw dbError;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error syncing calendar for ${date}:`, error);
    return null;
  }
}

/**
 * Helper functions
 */
function getDefaultMeetingTitle(date?: string): string {
  const dateString = date ? format(new Date(date), 'dd-MM-yy') : format(new Date(), 'dd-MM-yy');
  return process.env.DEFAULT_MEETING_TITLE 
    ? `${process.env.DEFAULT_MEETING_TITLE} ${dateString}` 
    : `GOALETE Club Session ${dateString}`;
}

function getDefaultMeetingDescription(): string {
  return process.env.DEFAULT_MEETING_DESCRIPTION || 
    'Join us for a GOALETE Club session to learn how to achieve any goal in life.';
}

// Platform-specific API operations

/**
 * Add a user (by email) as a registrant to a Zoom meeting.
 * @param meetingId Zoom meeting ID
 * @param email User's email to invite
 * @param name User's name (optional)
 * @returns Zoom API response
 */
export async function zoom_add_user_to_meeting(meetingId: string, email: string, name?: string) {
  try {
    // Get access token
    const accessToken = await get_zoom_token();
    
    const response = await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
      {
        email,
        first_name: name || email.split('@')[0]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Zoom add registrant error:', error.response?.data || error.message);
    throw new Error('Failed to add user to Zoom meeting');
  }
}

/**
 * SIMPLIFIED WRAPPER FUNCTIONS FOR BACKWARD COMPATIBILITY
 * These replace the old redundant functions with calls to the unified manageMeeting function
 */

/**
 * @deprecated Use manageMeeting instead. Kept for backward compatibility.
 */
export async function getOrCreateMeetingForDate(
  date: string,
  userId?: string
): Promise<MeetingWithUsers> {
  return await manageMeeting({
    date,
    userIds: userId ? [userId] : [],
    operation: 'getOrCreate',
    syncFromCalendar: true
  });
}

/**
 * @deprecated Use manageMeeting instead. Kept for backward compatibility.
 */
export async function addUserToTodaysMeeting(userId: string, targetDate?: string): Promise<MeetingWithUsers> {
  const dateToUse = targetDate || new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toISOString().split('T')[0];
  
  return await manageMeeting({
    date: dateToUse,
    userIds: [userId],
    operation: 'getOrCreate',
    syncFromCalendar: true
  });
}

/**
 * @deprecated Use manageMeeting instead. Kept for backward compatibility.
 */
export async function getOrCreateDailyMeeting(targetDate?: string): Promise<MeetingWithUsers | null> {
  try {
    const dateToUse = targetDate || new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toISOString().split('T')[0];
    
    // Get active users for today
    const today = new Date(dateToUse);
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        startDate: { lte: today },
        endDate: { gte: today }
      },
      select: { userId: true }
    });

    const userIds = activeSubscriptions.map(sub => sub.userId);
    
    return await manageMeeting({
      date: dateToUse,
      userIds,
      operation: 'getOrCreate',
      syncFromCalendar: true
    });
  } catch (error) {
    console.error('Error in getOrCreateDailyMeeting:', error);
    return null;
  }
}

/**
 * @deprecated Use manageMeeting with addUsersToMeeting instead. Kept for backward compatibility.
 */
export async function updateMeetingWithUsers(
  meetingId: string, 
  userIds: string[]
): Promise<MeetingWithUsers> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { users: true }
  });
  
  if (!meeting) {
    throw new Error(`Meeting with ID ${meetingId} not found`);
  }
  
  return await addUsersToMeeting(meeting as MeetingWithUsers, userIds);
}

/**
 * @deprecated Use manageMeeting instead. Kept for backward compatibility.
 */
export async function createMeeting({
  platform,
  date,
  startTime,
  duration,
  meetingTitle,
  meetingDesc
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number,
  meetingTitle?: string,
  meetingDesc?: string
}): Promise<MeetingWithUsers> {
  return await manageMeeting({
    date,
    platform,
    startTime,
    duration,
    meetingTitle,
    meetingDesc,
    operation: 'create',
    syncFromCalendar: false
  });
}

/**
 * @deprecated Use manageMeeting instead. Kept for backward compatibility.
 */
export async function createCompleteMeeting({
  platform,
  date,
  startTime,
  duration,
  meetingTitle,
  meetingDesc,
  userIds = []
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number,
  meetingTitle?: string,
  meetingDesc?: string,
  userIds?: string[]
}): Promise<MeetingWithUsers> {
  return await manageMeeting({
    date,
    platform,
    startTime,
    duration,
    meetingTitle,
    meetingDesc,
    userIds,
    operation: 'create',
    syncFromCalendar: false
  });
}

/**
 * @deprecated Use syncCalendarEvent directly. Kept for backward compatibility.
 */
export async function findAndSyncExistingGoogleEvent(date: string): Promise<MeetingWithUsers | null> {
  return await syncCalendarEvent(date);
}
