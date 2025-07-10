import prisma from './prisma';
import axios from 'axios';
import { google } from 'googleapis';
import { format } from 'date-fns';
import { MeetingWithUsers } from '../types/meeting';

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

// Enhanced Google Meet creation following Google Calendar API best practices
export async function google_create_meet({ 
  date, 
  startTime, 
  duration,
  meetingTitle = 'GOALETE Club Session',
  meetingDesc = 'Join us for a GOALETE Club session to learn how to achieve any goal in life.'
}: { 
  date: string, 
  startTime: string, 
  duration: number,
  meetingTitle?: string,
  meetingDesc?: string
}): Promise<{ join_url: string, id: string }> {
  try {
    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
    const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Meet API credentials are not set');
    }

    console.log(`Creating Google Meet for date: ${date}, time: ${startTime}, duration: ${duration} minutes`);

    const jwtClient = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    try {
      await jwtClient.authorize();
    } catch (authError) {
      console.error('Google Calendar API authorization failed:', authError);
      throw new Error(`Google Calendar API authorization failed: ${authError instanceof Error ? authError.message : String(authError)}`);
    }
    
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Create timezone-aware date objects
    const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // Generate a unique request ID for conference creation
    const conferenceRequestId = `goalete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create meeting with proper error handling and Google Meet integration
    let event;
    try {
      event = await calendar.events.insert({
        calendarId: GOOGLE_CALENDAR_ID,
        conferenceDataVersion: 1, // Required for Google Meet integration
        requestBody: {
          summary: meetingTitle,
          description: meetingDesc,
          start: { 
            dateTime: startDateTime.toISOString(), 
            timeZone: 'Asia/Kolkata' 
          },
          end: { 
            dateTime: endDateTime.toISOString(), 
            timeZone: 'Asia/Kolkata' 
          },
          // Configure Google Meet conference with security settings
          conferenceData: {
            createRequest: {
              requestId: conferenceRequestId,
              conferenceSolutionKey: {
                type: 'hangoutsMeet' // Use Google Meet
              }
            }
          },
          // Enhanced security settings for invite-only meetings (cross-domain compatible)
          visibility: 'private', // Keep meetings private by default
          guestsCanInviteOthers: false, // Prevent guests from inviting others
          guestsCanModify: false, // Prevent guests from modifying the event
          guestsCanSeeOtherGuests: true, // Allow guests to see other attendees
          anyoneCanAddSelf: false, // Prevent unauthorized self-addition
          // Add extended properties for internal tracking and security
          extendedProperties: {
            private: {
              'goaleTeApp': 'true',
              'securityLevel': 'invite-only',
              'meetingType': 'subscription-based',
              'createdBy': 'goalete-system',
              'version': '2.0',
              'crossDomainEnabled': 'true' // Track cross-domain support
            },
            shared: {
              'platform': 'goalete',
              'accessControl': 'restricted'
            }
          },
          // Set default event type for proper categorization
          eventType: 'default',
          // Add organizer metadata
          organizer: {
            email: GOOGLE_CLIENT_EMAIL,
            displayName: 'GOALETE Team'
          }
        }
      });
    } catch (eventError) {
      console.error('Google Calendar event creation failed:', eventError);
      const apiError = eventError as ApiError;
      if (apiError.response?.status === 403) {
        throw new Error('Google Calendar access denied. Please check your API permissions and ensure Calendar API is enabled.');
      } else if (apiError.response?.status === 401) {
        throw new Error('Google Calendar authentication failed. Please check your service account credentials.');
      } else if (apiError.response?.status === 400) {
        throw new Error(`Google Calendar bad request: ${apiError.response?.data?.error?.message || 'Invalid request parameters'}`);
      } else {
        throw new Error(`Google Calendar event creation failed: ${apiError.message || 'Unknown error'}`);
      }
    }
    
    if (!event?.data) {
      throw new Error('Google Calendar API returned empty response');
    }
    
    // Extract Google Meet link from conference data
    const conferenceData = event.data.conferenceData;
    if (!conferenceData || !conferenceData.entryPoints) {
      throw new Error('Failed to create Google Meet: No conference data in response');
    }
    
    const videoEntryPoint = conferenceData.entryPoints.find(
      (entry) => entry.entryPointType === 'video'
    );
    
    const join_url = videoEntryPoint?.uri || '';
    
    if (!join_url) {
      throw new Error('Failed to create Google Meet link: No video entry point found');
    }
    
    const eventId = event.data.id || '';
    if (!eventId) {
      throw new Error('Failed to create Google Meet event: No event ID returned');
    }
    
    console.log(`Successfully created Google Meet with ID: ${eventId}, Conference ID: ${conferenceData.conferenceId}`);
    console.log(`Meeting URL: ${join_url}`);
    
    return { join_url, id: eventId };
  } catch (error) {
    console.error('Error creating Google Meet:', error);
    throw error; // Re-throw to allow retry mechanism to work
  }
}

// Optimized function to add a single user to a Google Calendar event
export async function google_add_user_to_meeting(eventId: string, email: string, name?: string): Promise<void> {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }

  try {
    const jwtClient = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Get current event details
    const event = await calendar.events.get({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const attendees = event.data.attendees || [];
    
    // Check if user is already an attendee
    const existingAttendee = attendees.find(attendee => attendee.email === email);
    if (existingAttendee) {
      console.log(`User ${email} is already an attendee of event ${eventId}`);
      return;
    }

    // Add new attendee with enhanced security settings
    attendees.push({ 
      email, 
      displayName: name || email.split('@')[0],
      responseStatus: 'accepted' // Automatically accept to avoid RSVP requirement
    });

    // Update event with new attendee (cross-domain compatible)
    await calendar.events.patch({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId,
      sendUpdates: 'none', // Silent update - no email notifications sent (for individual additions)
      requestBody: {
        attendees,
        // Update extended properties to track cross-domain addition
        extendedProperties: {
          private: {
            'lastSingleUserUpdate': new Date().toISOString(),
            'addedUserDomain': email.split('@')[1] || 'unknown',
            'totalAttendees': attendees.length.toString(),
            'crossDomainSupported': 'true'
          }
        }
      }
    });

    console.log(`Successfully added ${email} to Google Calendar event ${eventId}`);
  } catch (error) {
    console.error(`Error adding user ${email} to Google Calendar event ${eventId}:`, error);
    throw new Error(`Failed to add user to Google Calendar event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Optimized function to add multiple users to a Google Calendar event in batch
export async function google_add_users_to_meeting(eventId: string, users: { email: string, name?: string }[]): Promise<void> {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }

  if (users.length === 0) {
    console.log('No users to add to meeting');
    return;
  }

  try {
    const jwtClient = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Get current event details
    const event = await calendar.events.get({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const existingAttendees = event.data.attendees || [];
    const existingEmails = new Set(existingAttendees.map(attendee => attendee.email));
    
    // Filter out users who are already attendees
    const newUsers = users.filter(user => !existingEmails.has(user.email));
    
    if (newUsers.length === 0) {
      console.log('All users are already attendees of the event');
      return;
    }

    // Add new attendees with security settings
    const newAttendees = newUsers.map(user => ({
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      responseStatus: 'accepted' as const // Auto-accept to avoid RSVP requirement
    }));

    const updatedAttendees = [...existingAttendees, ...newAttendees];

    // Update event with new attendees (cross-domain batch operation)
    await calendar.events.patch({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId,
      sendUpdates: 'externalOnly', // Send updates only to external attendees (supports all domains)
      requestBody: {
        attendees: updatedAttendees,
        // Update extended properties to track the cross-domain batch addition
        extendedProperties: {
          private: {
            'lastBatchUpdate': new Date().toISOString(),
            'batchSize': newUsers.length.toString(),
            'totalAttendees': updatedAttendees.length.toString(),
            'crossDomainBatch': 'true',
            'domainList': [...new Set(newUsers.map(user => user.email.split('@')[1] || 'unknown'))].join(',')
          }
        }
      }
    });

    console.log(`Successfully added ${newUsers.length} users to Google Calendar event ${eventId}`);
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
 * @param userId User ID to add
 * @param targetDate Optional date (defaults to today)
 * @returns Updated meeting record or null if no meeting exists
 */
export async function addUserToTodaysMeeting(userId: string, targetDate?: string): Promise<MeetingWithUsers | null> {
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
      console.log(`No meeting found for ${dateStr}, cannot add user ${userId}`);
      return null;
    }

    // Check if user is already in the meeting
    const isUserAlreadyInMeeting = todaysMeeting.users.some(user => user.id === userId);
    if (isUserAlreadyInMeeting) {
      console.log(`User ${userId} is already in today's meeting`);
      return todaysMeeting;
    }

    // Add user to the meeting
    console.log(`Adding user ${userId} to today's meeting ${todaysMeeting.id}`);
    return await updateMeetingWithUsers(todaysMeeting.id, [userId]);
  } catch (error) {
    console.error(`Error adding user ${userId} to today's meeting:`, error);
    throw error;
  }
}

/**
 * Enhanced security settings for Google Meet events with cross-domain support
 * These settings ensure only invited users can join and prevent unauthorized access
 * while supporting attendees from any email domain
 */
export const GOOGLE_MEET_SECURITY_SETTINGS = {
  // Event visibility and access control (cross-domain compatible)
  visibility: 'private' as const,
  guestsCanInviteOthers: false,
  guestsCanModify: false,
  guestsCanSeeOtherGuests: true,
  anyoneCanAddSelf: false, // Prevent unauthorized self-addition
  
  // Extended properties for tracking and security
  extendedProperties: {
    private: {
      'goaleTeApp': 'true',
      'securityLevel': 'invite-only',
      'meetingType': 'subscription-based',
      'createdBy': 'goalete-system',
      'version': '2.0',
      'accessControl': 'restricted',
      'crossDomainEnabled': 'true', // Explicitly enable cross-domain support
      'crossDomainVersion': '1.0'
    },
    shared: {
      'platform': 'goalete',
      'eventSource': 'automated-system',
      'supportsExternalDomains': 'true'
    }
  }
};

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
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }

  try {
    const jwtClient = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Merge default security settings with additional settings
    const securitySettings = {
      ...GOOGLE_MEET_SECURITY_SETTINGS,
      ...additionalSettings,
      extendedProperties: {
        ...GOOGLE_MEET_SECURITY_SETTINGS.extendedProperties,
        private: {
          ...GOOGLE_MEET_SECURITY_SETTINGS.extendedProperties.private,
          'securityEnhanced': new Date().toISOString(),
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
      calendarId: GOOGLE_CALENDAR_ID,
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
}> {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }

  try {
    const jwtClient = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    const event = await calendar.events.get({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId
    });

    if (!event.data) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const eventData = event.data;
    const extendedProps = eventData.extendedProperties;
    
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
      }))
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
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }

  if (users.length === 0) {
    console.log('No users to add to meeting');
    return { addedUsers: [], skippedUsers: [], domainAnalysis: [] };
  }

  try {
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

    const jwtClient = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Get current event details
    const event = await calendar.events.get({
      calendarId: GOOGLE_CALENDAR_ID,
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

    // Add new attendees with cross-domain support
    const newAttendees = newUsers.map(user => ({
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      responseStatus: 'accepted' as const // Auto-accept for seamless cross-domain experience
    }));

    const updatedAttendees = [...existingAttendees, ...newAttendees];

    // Get domain breakdown for tracking
    const domainBreakdown = emailValidation.domainAnalysis
      .filter(d => newUsers.some(u => u.email.includes(d.domain)))
      .map(d => `${d.domain}:${d.count}`)
      .join(';');

    // Update event with enhanced cross-domain tracking
    await calendar.events.patch({
      calendarId: GOOGLE_CALENDAR_ID,
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
            'hasExternalDomains': emailValidation.hasExternalDomains.toString()
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

// ...existing code...
