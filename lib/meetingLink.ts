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
 * @returns Promise<string> meeting link
 */
export async function createMeetingLink({
  platform,
  date,
  startTime,
  duration
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number
}): Promise<string> {
  if (platform === 'google-meet') {
    const { join_url } = await google_create_meet({ date, startTime, duration });
    return join_url;
  } else if (platform === 'zoom') {
    const { join_url } = await zoom_create_meet({ date, startTime, duration });
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
    const finalMeetingTitle = meetingTitle || process.env.DEFAULT_MEETING_TITLE || 'GOALETE Club Session';
    const finalMeetingDesc = meetingDesc || process.env.DEFAULT_MEETING_DESCRIPTION || 'Join us for a GOALETE Club session to learn how to achieve any goal in life.';
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    console.log(`Creating Google Meet for date: ${date}, time: ${startTime}, duration: ${duration} minutes`);
    console.log(`Using calendar ID: ${calendarId}`);

    // Use service account authentication with Domain-Wide Delegation
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);

    // Create IST timezone-aware date objects following Google Calendar API guidelines
    const IST_TIMEZONE = 'Asia/Kolkata';
    const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

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
            dateTime: startDateTime.toISOString(), 
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
            dateTime: startDateTime.toISOString(), 
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

export async function zoom_create_meet({ date, startTime, duration }: { date: string, startTime: string, duration: number }): Promise<{ join_url: string, id: string, start_url: string }> {
  const ZOOM_USER_ID = process.env.ZOOM_USER_ID;
  
  if (!ZOOM_USER_ID) {
    throw new Error('Zoom User ID is not set');
  }
  
  // Get access token
  const accessToken = await get_zoom_token();
  
  // Construct start time in ISO format (Zoom expects UTC)
  const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
  
  // Create a Date object and convert to UTC
  const utcDate = new Date(startDateTime.toISOString());
  
  // Format as ISO string (Zoom's expected format)
  const startTimeUTC = utcDate.toISOString();

  const meetingConfig = {
    topic: 'GOALETE Club Session',
    type: 2, // Scheduled meeting
    start_time: startTimeUTC,
    duration: duration, // in minutes
    timezone: 'Asia/Kolkata',
    agenda: 'Join us for a GOALETE Club session to learn how to achieve any goal in life.',
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
 * Core function 1: Create a meeting on the specified platform and store in database
 * Optimized version - only creates the meeting, users are added later via cron job
 * @param args.platform 'google-meet' | 'zoom'
 * @param args.date ISO date string (YYYY-MM-DD)
 * @param args.startTime string (HH:MM, 24-hour format)
 * @param args.duration number (minutes)
 * @param args.meetingTitle optional title for the meeting
 * @param args.meetingDesc optional description for the meeting
 * @returns Meeting record (without users - they will be added by cron job)
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
  let meetingLink = '';
  let googleEventId: string | undefined = undefined;
  let zoomMeetingId: string | undefined = undefined;
  let zoomStartUrl: string | undefined = undefined;

  const finalMeetingTitle = meetingTitle || 'GOALETE Club Session';
  const finalMeetingDesc = meetingDesc || 'Join us for a GOALETE Club session to learn how to achieve any goal in life.';

  if (platform === 'google-meet') {
    const { join_url, id } = await google_create_meet({ 
      date, 
      startTime, 
      duration,
      meetingTitle: finalMeetingTitle,
      meetingDesc: finalMeetingDesc
    });
    meetingLink = join_url;
    googleEventId = id;  
  } 
  else if (platform === 'zoom') {
    const response = await zoom_create_meet({ date, startTime, duration });
    meetingLink = response.join_url;
    zoomMeetingId = response.id?.toString();
    
    if (response.start_url) {
      zoomStartUrl = response.start_url;
    }
  }

  const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + duration);
  
  // Create meeting record without users - they will be added by cron job
  const meeting = await prisma.meeting.create({
    data: {
      meetingDate: new Date(date),
      platform,
      meetingLink,
      startTime: startDateTime,
      endTime: endDateTime,
      createdBy: 'admin',
      meetingTitle: finalMeetingTitle,
      meetingDesc: finalMeetingDesc,
      googleEventId,
      zoomMeetingId,
      zoomStartUrl,
      isDefault: false
    },
    include: { users: true }
  });
  
  console.log(`Created ${platform} meeting for ${date} at ${startTime} with ID: ${meeting.id}`);
  
  return meeting;
}

/**
 * Core function 2: Update meeting with users (optimized for batch operations)
 * This function updates a meeting by adding users both in the platform and in the database
 * @param meetingId database ID of the meeting
 * @param userIds array of user IDs to add to the meeting
 * @returns Updated meeting record
 */
export async function updateMeetingWithUsers(
  meetingId: string, 
  userIds: string[]
): Promise<MeetingWithUsers> {
  if (userIds.length === 0) {
    // Return existing meeting if no users to add
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { users: true }
    });
    
    if (!meeting) {
      throw new Error(`Meeting with ID ${meetingId} not found`);
    }
    
    return meeting;
  }

  // Fetch the meeting to check platform
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { users: true }
  });
  
  if (!meeting) {
    throw new Error(`Meeting with ID ${meetingId} not found`);
  }

  // Get existing user IDs to avoid duplicates
  const existingUserIds = new Set(meeting.users.map(user => user.id));
  const newUserIds = userIds.filter(userId => !existingUserIds.has(userId));
  
  if (newUserIds.length === 0) {
    console.log('All users are already in the meeting');
    return meeting;
  }

  // Fetch user details for new users only
  const newUsers = await prisma.user.findMany({
    where: { 
      id: { in: newUserIds }
    },
    select: { 
      id: true,
      email: true, 
      firstName: true, 
      lastName: true 
    }
  });
  
  if (newUsers.length === 0) {
    console.log('No valid users found to add to meeting');
    return meeting;
  }

  // Prepare user data for platform integration
  const usersForPlatform = newUsers
    .filter(user => user.email) // Only users with valid emails
    .map(user => ({
      email: user.email,
      name: user.firstName 
        ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) 
        : user.email.split('@')[0]
    }));

  // Add users to the platform's meeting (batch operation)
  try {
    if (meeting.platform === 'google-meet' && meeting.googleEventId && usersForPlatform.length > 0) {
      await google_add_users_to_meeting(meeting.googleEventId, usersForPlatform);
    } else if (meeting.platform === 'zoom' && meeting.zoomMeetingId && usersForPlatform.length > 0) {
      // For Zoom, we still need to add users one by one due to API limitations
      for (const user of usersForPlatform) {
        try {
          await zoom_add_user_to_meeting(meeting.zoomMeetingId, user.email, user.name);
        } catch (error) {
          console.error(`Failed to add ${user.email} to Zoom meeting:`, error);
          // Continue with other users even if one fails
        }
      }
    }
  } catch (platformError) {
    console.error('Error adding users to platform meeting:', platformError);
    // Continue with database update even if platform update fails
  }
  
  // Update the meeting in the database with the new users
  const updatedMeeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      users: {
        connect: newUsers.map(user => ({ id: user.id }))
      }
    },
    include: { users: true }
  });
  
  console.log(`Successfully added ${newUsers.length} users to meeting ${meetingId} (${meeting.platform})`);
  
  return updatedMeeting;
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
 * Get a meeting for a specific date, or create one if it doesn't exist
 * This is particularly useful for cron jobs and handling immediate meeting invites
 * @param date ISO date string (YYYY-MM-DD)
 * @param userId Optional user ID to add to the meeting
 * @returns Meeting record
 */
export async function getOrCreateMeetingForDate(
  date: string,
  userId?: string
): Promise<MeetingWithUsers> {
  const dateObj = new Date(date);
  
  // Check if there's already a meeting for this date
  const existingMeeting = await prisma.meeting.findFirst({
    where: {
      meetingDate: {
        gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        lt: new Date(dateObj.setHours(23, 59, 59, 999))
      }
    },
    include: { users: true },
    orderBy: {
      createdAt: "desc"
    }
  });
  
  // If a meeting exists
  if (existingMeeting) {
    // If userId is provided, add the user to the meeting
    if (userId) {
      // Check if user is already added to avoid duplicates
      const isUserAlreadyAdded = existingMeeting.users?.some(user => user.id === userId);
      
      if (!isUserAlreadyAdded) {
        return await updateMeetingWithUsers(existingMeeting.id, [userId]);
      }
    }
    return existingMeeting;
  }
  
  // No meeting exists, create a new one
  const defaultPlatform = process.env.DEFAULT_MEETING_PLATFORM || "google-meet";
  const defaultTime = process.env.DEFAULT_MEETING_TIME || "21:00";
  const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || "60");
    // Create meeting with or without the user
  if (userId) {
    return await createCompleteMeeting({
      platform: defaultPlatform as 'google-meet' | 'zoom',
      date,
      startTime: defaultTime,
      duration: defaultDuration,
      userIds: [userId],
      meetingTitle: "GOALETE Club Daily Session",
      meetingDesc: "Join us for a GOALETE Club session to learn how to achieve any goal in life."
    });
  } else {
    return await createMeeting({
      platform: defaultPlatform as 'google-meet' | 'zoom',
      date,
      startTime: defaultTime,
      duration: defaultDuration,
      meetingTitle: "GOALETE Club Daily Session",
      meetingDesc: "Join us for a GOALETE Club session to learn how to achieve any goal in life."
    });
  }
}

/**
 * Create a new meeting from scratch with multiple users (if provided)
 * Optimized version - creates meeting first, then adds users efficiently
 * @param platform 'google-meet' | 'zoom'
 * @param date ISO date string (YYYY-MM-DD)
 * @param meetingDetails Optional meeting details (title, description, etc.)
 * @param userIds Optional array of user IDs to add to the meeting
 * @returns Meeting record
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
  // Create the meeting first (without users for efficiency)
  const meeting = await createMeeting({
    platform,
    date,
    startTime,
    duration,
    meetingTitle,
    meetingDesc
  });
  
  // If there are users to add, update the meeting with users
  if (userIds.length > 0) {
    console.log(`Adding ${userIds.length} users to meeting ${meeting.id}`);
    return await updateMeetingWithUsers(meeting.id, userIds);
  }
  
  return meeting;
}

/**
 * Create a meeting link with retry capability
 * @param options Meeting creation options
 * @param maxRetries Maximum retry attempts (default: 3)
 * @returns Promise with meeting link and ID
 */
export async function createMeetingLinkWithRetry({
  platform,
  date,
  startTime,
  duration
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number
}, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createMeetingLink({ platform, date, startTime, duration });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Meeting creation attempt ${attempt}/${maxRetries} failed:`, {
        error: lastError.message,
        platform,
        date,
        startTime,
        duration,
        stack: lastError.stack,
        timestamp: new Date().toISOString()
      });
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, ...
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError || new Error('Failed to create meeting link after multiple attempts');
}

/**
 * Get or create a meeting for today and efficiently manage users
 * Optimized for daily cron job usage (10 AM IST)
 * @param targetDate Optional date (defaults to today in IST)
 * @returns Meeting record with users
 */
export async function getOrCreateDailyMeeting(targetDate?: string): Promise<MeetingWithUsers | null> {
  try {
    // Get target date in IST (default to today)
    let dateToCheck: Date;
    if (targetDate) {
      dateToCheck = new Date(targetDate);
    } else {
      dateToCheck = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    }
    dateToCheck.setHours(0, 0, 0, 0);

    const dateStr = format(dateToCheck, 'yyyy-MM-dd');
    console.log(`Checking for meetings on ${dateStr}`);

    // Check if we already have a meeting for this date
    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        meetingDate: {
          gte: new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate(), 0, 0, 0),
          lt: new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate() + 1, 0, 0, 0)
        }
      },
      include: { users: true },
      orderBy: { createdAt: 'desc' } // Get the most recent meeting if multiple exist
    });

    // Get all users with active subscriptions for this date
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        startDate: { lte: dateToCheck },
        endDate: { gte: dateToCheck }
      },
      select: { userId: true }
    });

    const activeUserIds = activeSubscriptions.map(sub => sub.userId);
    console.log(`Found ${activeUserIds.length} active subscriptions for ${dateStr}`);

    if (existingMeeting) {
      console.log(`Found existing meeting for ${dateStr}: ${existingMeeting.id} (created by: ${existingMeeting.createdBy})`);
      
      // Check if we need to add any users to the existing meeting
      const existingUserIds = existingMeeting.users.map(user => user.id);
      const usersToAdd = activeUserIds.filter(userId => !existingUserIds.includes(userId));
      
      if (usersToAdd.length > 0) {
        console.log(`Adding ${usersToAdd.length} new active users to existing meeting`);
        return await updateMeetingWithUsers(existingMeeting.id, [...existingUserIds, ...usersToAdd]);
      } else {
        console.log(`All active users are already in the existing meeting`);
        return existingMeeting;
      }
    }

    // No existing meeting found, create a default meeting with active users
    console.log(`No existing meeting found for ${dateStr}, creating default meeting`);

    const defaultPlatform = process.env.DEFAULT_MEETING_PLATFORM || 'google-meet';
    const defaultTime = process.env.DEFAULT_MEETING_TIME || '21:00';
    const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || '60');

    console.log(`Creating default meeting: platform=${defaultPlatform}, time=${defaultTime}, duration=${defaultDuration}, users=${activeUserIds.length}`);

    // Create the meeting with all active users
    const meeting = await createCompleteMeeting({
      platform: defaultPlatform as 'google-meet' | 'zoom',
      date: dateStr,
      startTime: defaultTime,
      duration: defaultDuration,
      meetingTitle: 'GOALETE Club Daily Session',
      meetingDesc: 'Join us for a GOALETE Club session to learn how to achieve any goal in life.',
      userIds: activeUserIds
    });

    // Mark this as a system-generated default meeting
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { 
        createdBy: 'system-default',
        isDefault: true 
      }
    });

    console.log(`Successfully created default meeting ${meeting.id} for ${dateStr} with ${activeUserIds.length} users`);
    
    return meeting;
  } catch (error) {
    console.error('Error in getOrCreateDailyMeeting:', error);
    throw error;
  }
}

/**
 * Add a single user to today's meeting (for immediate invites)
 * Optimized for users who register after cron job but before meeting time
 * If no meeting exists, creates a new one automatically
 * @param userId User ID to add
 * @param targetDate Optional date (defaults to today)
 * @returns Updated meeting record
 */
export async function addUserToTodaysMeeting(userId: string, targetDate?: string): Promise<MeetingWithUsers> {
  try {
    // Get target date in IST (default to today)
    let dateToCheck: Date;
    if (targetDate) {
      dateToCheck = new Date(targetDate);
    } else {
      dateToCheck = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    }
    dateToCheck.setHours(0, 0, 0, 0);

    const dateStr = format(dateToCheck, 'yyyy-MM-dd');

    // Find today's meeting
    const todaysMeeting = await prisma.meeting.findFirst({
      where: {
        meetingDate: {
          gte: new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate(), 0, 0, 0),
          lt: new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate() + 1, 0, 0, 0)
        }
      },
      include: { users: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!todaysMeeting) {
      console.log(`No meeting found for ${dateStr}, creating new meeting and adding user ${userId}`);
      
      // Create a new meeting with this user using getOrCreateMeetingForDate
      return await getOrCreateMeetingForDate(dateStr, userId);
    }

    // Check if user is already in the meeting
    const isUserAlreadyInMeeting = todaysMeeting.users.some(user => user.id === userId);
    if (isUserAlreadyInMeeting) {
      console.log(`User ${userId} is already in today's meeting`);
      return todaysMeeting;
    }

    // Add user to the existing meeting
    console.log(`Adding user ${userId} to today's meeting ${todaysMeeting.id}`);
    return await updateMeetingWithUsers(todaysMeeting.id, [userId]);
  } catch (error) {
    console.error(`Error adding user ${userId} to today's meeting:`, error);
    throw error;
  }
}

/**
 * Enhanced security settings for Google Meet events with cross-domain support
 * Following Google Calendar API best practices for invite-only meetings
 */
export const GOOGLE_MEET_SECURITY_SETTINGS = {
  // Event visibility and access control (cross-domain compatible)
  visibility: 'private' as const,
  guestsCanInviteOthers: false,
  guestsCanModify: false,
  guestsCanSeeOtherGuests: true,
  anyoneCanAddSelf: false, // Prevent unauthorized self-addition
  locked: false, // Allow updates for user management
  
  // Enhanced extended properties for security tracking
  extendedProperties: {
    private: {
      'goaleTeApp': 'true',
      'securityLevel': 'invite-only-strict',
      'meetingType': 'subscription-based',
      'createdBy': 'goalete-service-account',
      'version': '4.0',
      'accessControl': 'restricted-invite-only',
      'crossDomainEnabled': 'true',
      'autoAcceptanceEnabled': 'true',
      'timezone': 'Asia/Kolkata'
    },
    shared: {
      'platform': 'goalete',
      'eventSource': 'automated-system',
      'supportsExternalDomains': 'true',
      'securityLevel': 'high'
    }
  },
  
  // Default reminder configuration
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 60 }, // 1 hour before
      { method: 'email', minutes: 15 }  // 15 minutes before
    ]
  }
};

/**
 * Check and update pending Google Meet links for events
 * Some conference data might be created asynchronously
 * @param eventId Google Calendar event ID
 * @returns Updated meeting link or null if still pending
 */
export async function updatePendingMeetingLink(eventId: string): Promise<string | null> {
  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Get current event details
    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Check if conference data is now available
    const conferenceData = event.data.conferenceData;
    
    if (conferenceData && conferenceData.entryPoints) {
      // Find video entry point (Google Meet link)
      const videoEntryPoint = conferenceData.entryPoints.find(
        (entry: any) => entry.entryPointType === 'video'
      );
      
      if (videoEntryPoint && videoEntryPoint.uri) {
        console.log(`Conference link now available for event ${eventId}: ${videoEntryPoint.uri}`);
        return videoEntryPoint.uri;
      }
    }
    
    // Check hangoutLink as fallback
    if (event.data.hangoutLink) {
      console.log(`Hangout link available for event ${eventId}: ${event.data.hangoutLink}`);
      return event.data.hangoutLink;
    }

    // Conference creation might still be pending
    const createRequestStatus = conferenceData?.createRequest?.status;
    console.log(`Conference creation status for event ${eventId}: ${createRequestStatus || 'unknown'}`);
    
    return null; // Still pending
  } catch (error) {
    console.error(`Error checking pending meeting link for event ${eventId}:`, error);
    throw new Error(`Failed to check pending meeting link: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Enhance an existing Google Meet event with additional security settings
 * This function can be used to upgrade existing meetings to use the latest security model
 * @param eventId Google Calendar event ID
 * @param additionalSettings Optional additional settings to apply
 * @returns Promise<void>
 */
export async function enhanceMeetingSecurity(
  eventId: string, 
  additionalSettings: Partial<typeof GOOGLE_MEET_SECURITY_SETTINGS> = {}
): Promise<void> {
  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Merge default security settings with additional settings
    const securitySettings = {
      ...GOOGLE_MEET_SECURITY_SETTINGS,
      ...additionalSettings,
      extendedProperties: {
        ...GOOGLE_MEET_SECURITY_SETTINGS.extendedProperties,
        private: {
          ...GOOGLE_MEET_SECURITY_SETTINGS.extendedProperties.private,
          'securityEnhanced': new Date().toISOString(),
          'enhancementVersion': '4.0',
          ...additionalSettings.extendedProperties?.private
        },
        shared: {
          ...GOOGLE_MEET_SECURITY_SETTINGS.extendedProperties.shared,
          ...additionalSettings.extendedProperties?.shared
        }
      }
    };

    // Apply security enhancements
    await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      sendUpdates: 'none', // Silent update
      requestBody: securitySettings
    });

    console.log(`Successfully enhanced security for Google Calendar event ${eventId}`);
  } catch (error) {
    console.error(`Error enhancing security for event ${eventId}:`, error);
    throw new Error(`Failed to enhance meeting security: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get comprehensive meeting security status and attendee information
 * @param eventId Google Calendar event ID
 * @returns Meeting security details and attendee list
 */
export async function getMeetingSecurityStatus(eventId: string): Promise<{
  isSecure: boolean;
  securityLevel: string;
  attendeeCount: number;
  hasExtendedProperties: boolean;
  visibility: string;
  guestPermissions: {
    canInviteOthers: boolean;
    canModify: boolean;
    canSeeOtherGuests: boolean;
  };
  attendees: Array<{
    email: string;
    responseStatus: string;
    organizer?: boolean;
  }>;
  conferenceData?: {
    hasConference: boolean;
    conferenceSolution?: string;
    entryPoints: number;
    status?: string;
  };
}> {
  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const eventData = event.data;
    const extendedProps = eventData.extendedProperties;
    const conferenceData = eventData.conferenceData;
    
    return {
      isSecure: eventData.visibility === 'private' && 
                eventData.guestsCanInviteOthers === false && 
                eventData.guestsCanModify === false,
      securityLevel: extendedProps?.private?.securityLevel || 'unknown',
      attendeeCount: eventData.attendees?.length || 0,
      hasExtendedProperties: !!extendedProps,
      visibility: eventData.visibility || 'default',
      guestPermissions: {
        canInviteOthers: eventData.guestsCanInviteOthers ?? true,
        canModify: eventData.guestsCanModify ?? true,
        canSeeOtherGuests: eventData.guestsCanSeeOtherGuests ?? true
      },
      attendees: (eventData.attendees || []).map(attendee => ({
        email: attendee.email || 'unknown',
        responseStatus: attendee.responseStatus || 'unknown',
        organizer: attendee.organizer || false
      })),
      conferenceData: conferenceData ? {
        hasConference: true,
        conferenceSolution: conferenceData.conferenceSolution?.name || undefined,
        entryPoints: conferenceData.entryPoints?.length || 0,
        status: (conferenceData.createRequest?.status as string) || undefined
      } : {
        hasConference: false,
        entryPoints: 0
      }
    };
  } catch (error) {
    console.error(`Error getting security status for event ${eventId}:`, error);
    throw new Error(`Failed to get meeting security status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate email addresses for cross-domain invites and categorize by domain
 * @param emails Array of email addresses to validate
 * @returns Analysis of email domains and validation results
 */
export function validateCrossDomainEmails(emails: string[]): {
  validEmails: string[];
  invalidEmails: string[];
  domainAnalysis: {
    domain: string;
    count: number;
    isExternal: boolean;
  }[];
  totalDomains: number;
  hasExternalDomains: boolean;
} {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const organizerDomain = GOOGLE_CLIENT_EMAIL.split('@')[1] || '';

  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  const domainCounts = new Map<string, number>();

  // Validate each email and count domains
  emails.forEach(email => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      validEmails.push(email);
      const domain = email.split('@')[1];
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    } else {
      invalidEmails.push(email);
    }
  });

  // Create domain analysis
  const domainAnalysis = Array.from(domainCounts.entries()).map(([domain, count]) => ({
    domain,
    count,
    isExternal: domain !== organizerDomain
  }));

  const hasExternalDomains = domainAnalysis.some(d => d.isExternal);
  const totalDomains = domainAnalysis.length;

  console.log(`Cross-domain email analysis: ${validEmails.length} valid, ${invalidEmails.length} invalid, ${totalDomains} domains, external domains: ${hasExternalDomains}`);

  return {
    validEmails,
    invalidEmails,
    domainAnalysis,
    totalDomains,
    hasExternalDomains
  };
}

/**
 * Enhanced cross-domain attendee addition with domain validation and tracking
 * @param eventId Google Calendar event ID
 * @param users Array of users with email and name
 * @returns Promise<void>
 */
export async function google_add_users_to_meeting_cross_domain(
  eventId: string, 
  users: { email: string, name?: string }[]
): Promise<{
  addedUsers: { email: string, name?: string }[];
  skippedUsers: { email: string, reason: string }[];
  domainAnalysis: ReturnType<typeof validateCrossDomainEmails>['domainAnalysis'];
}> {
  if (users.length === 0) {
    console.log('No users to add to meeting');
    return { addedUsers: [], skippedUsers: [], domainAnalysis: [] };
  }

  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Validate emails and analyze domains
    const emailValidation = validateCrossDomainEmails(users.map(u => u.email));
    console.log(`Cross-domain validation: ${emailValidation.validEmails.length} valid emails across ${emailValidation.totalDomains} domains`);

    // Filter users to only include valid emails
    const validUsers = users.filter(user => emailValidation.validEmails.includes(user.email));
    const skippedUsers = users
      .filter(user => !emailValidation.validEmails.includes(user.email))
      .map(user => ({ email: user.email, reason: 'Invalid email format' }));

    if (validUsers.length === 0) {
      console.log('No valid users to add to meeting after validation');
      return { addedUsers: [], skippedUsers, domainAnalysis: emailValidation.domainAnalysis };
    }

    // Get current event details
    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const existingAttendees = event.data.attendees || [];
    const existingEmails = new Set(existingAttendees.map(attendee => attendee.email));
    
    // Filter out users who are already attendees
    const newUsers = validUsers.filter(user => !existingEmails.has(user.email));
    const alreadyInvitedUsers = validUsers
      .filter(user => existingEmails.has(user.email))
      .map(user => ({ email: user.email, reason: 'Already invited' }));

    skippedUsers.push(...alreadyInvitedUsers);
    
    if (newUsers.length === 0) {
      console.log('All valid users are already attendees of the event');
      return { addedUsers: [], skippedUsers, domainAnalysis: emailValidation.domainAnalysis };
    }

    // Add new attendees with cross-domain support and auto-acceptance
    const newAttendees = newUsers.map(user => ({
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      responseStatus: 'accepted' as const, // Auto-accept for seamless cross-domain experience
      additionalGuests: 0, // Prevent additional guests for security
      optional: false // Required attendance
    }));

    const updatedAttendees = [...existingAttendees, ...newAttendees];

    // Get domain breakdown for tracking
    const domainBreakdown = emailValidation.domainAnalysis
      .filter(d => newUsers.some(u => u.email.includes(d.domain)))
      .map(d => `${d.domain}:${d.count}`)
      .join(';');

    // Update event with enhanced cross-domain tracking
    await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      sendUpdates: 'externalOnly', // Critical for cross-domain invites
      requestBody: {
        attendees: updatedAttendees,
        // Enhanced extended properties for cross-domain tracking
        extendedProperties: {
          private: {
            'lastCrossDomainUpdate': new Date().toISOString(),
            'crossDomainBatchSize': newUsers.length.toString(),
            'totalAttendees': updatedAttendees.length.toString(),
            'crossDomainEnabled': 'true',
            'domainBreakdown': domainBreakdown,
            'externalDomainCount': emailValidation.domainAnalysis.filter(d => d.isExternal).length.toString(),
            'hasExternalDomains': emailValidation.hasExternalDomains.toString(),
            'autoAcceptanceEnabled': 'true',
            'timezone': 'Asia/Kolkata',
            'authMethod': 'service-account'
          }
        }
      }
    });

    console.log(`Successfully added ${newUsers.length} cross-domain users to Google Calendar event ${eventId}`);
    console.log(`Domain breakdown: ${domainBreakdown}`);
    
    return { 
      addedUsers: newUsers, 
      skippedUsers, 
      domainAnalysis: emailValidation.domainAnalysis 
    };

  } catch (error) {
    console.error(`Error adding cross-domain users to Google Calendar event ${eventId}:`, error);
    throw new Error(`Failed to add cross-domain users to Google Calendar event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update meeting record in database with actual Google Meet link
 * Call this function periodically to check for pending conference links
 * @param meetingId Database meeting ID
 * @returns Updated meeting record or null if link still pending
 */
export async function updateMeetingWithActualLink(meetingId: string): Promise<MeetingWithUsers | null> {
  try {
    // Get meeting from database
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { users: true }
    });

    if (!meeting) {
      throw new Error(`Meeting with ID ${meetingId} not found in database`);
    }

    // Skip if not Google Meet or no event ID
    if (meeting.platform !== 'google-meet' || !meeting.googleEventId) {
      console.log(`Meeting ${meetingId} is not a Google Meet event or has no event ID`);
      return meeting;
    }

    // Skip if already has a proper meeting link
    if (meeting.meetingLink && 
        meeting.meetingLink !== 'pending-meet-link-creation' && 
        meeting.meetingLink.includes('meet.google.com')) {
      console.log(`Meeting ${meetingId} already has a valid Google Meet link`);
      return meeting;
    }

    // Check for updated meeting link
    const updatedLink = await updatePendingMeetingLink(meeting.googleEventId);
    
    if (updatedLink && updatedLink !== 'pending-meet-link-creation') {
      // Update meeting record with actual link
      const updatedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: { meetingLink: updatedLink },
        include: { users: true }
      });

      console.log(`Updated meeting ${meetingId} with actual Google Meet link: ${updatedLink}`);
      return updatedMeeting;
    }

    console.log(`Meeting link still pending for meeting ${meetingId}`);
    return null; // Link still pending
  } catch (error) {
    console.error(`Error updating meeting ${meetingId} with actual link:`, error);
    throw new Error(`Failed to update meeting with actual link: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Credit-efficient utility function to get minimal event data (for status checks only)
export async function google_get_meeting_status(eventId: string): Promise<{
  exists: boolean;
  attendeeCount?: number;
  meetingLink?: string;
  summary?: string;
  domains?: string[];
}> {
  try {
    const impersonateUser = getAdminEmail();
    const calendar = await getCalendarClient(impersonateUser);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Ultra-minimal fields to reduce quota consumption and bandwidth
    const event = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId,
      fields: 'id,summary,attendees,hangoutLink,extendedProperties/private'
    });

    if (!event.data) {
      return { exists: false };
    }

    const attendees = event.data.attendees || [];
    const domains = [...new Set(
      attendees
        .map((attendee: any) => attendee.email?.split('@')[1])
        .filter(Boolean)
    )];

    return {
      exists: true,
      attendeeCount: attendees.length,
      meetingLink: event.data.hangoutLink || undefined,
      summary: event.data.summary || undefined,
      domains
    };
  } catch (error) {
    console.error(`Error checking meeting status for event ${eventId}:`, error);
    return { exists: false };
  }
}
