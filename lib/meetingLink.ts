import prisma from './prisma';
import axios from 'axios';
import { google } from 'googleapis';
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

// Replace google_create_meet to use Google Calendar API
export async function google_create_meet({ date, startTime, duration }: { date: string, startTime: string, duration: number }): Promise<{ join_url: string, id: string }> {
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

    const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // Create meeting with proper error handling
    let event;
    try {
      event = await calendar.events.insert({
        calendarId: GOOGLE_CALENDAR_ID,
        requestBody: {
          summary: 'GOALETE Club Session',
          description: 'Join us for a GOALETE Club session to learn how to achieve any goal in life.',
          start: { dateTime: startDateTime.toISOString(), timeZone: 'Asia/Kolkata' },
          end: { dateTime: endDateTime.toISOString(), timeZone: 'Asia/Kolkata' },
          conferenceData: {
            createRequest: { requestId: `${Date.now()}-goalete` }
          },
        },
        conferenceDataVersion: 1
      });
    } catch (eventError) {
      console.error('Google Calendar event creation failed:', eventError);
      const apiError = eventError as ApiError;
      if (apiError.response?.status === 403) {
        throw new Error('Google Calendar access denied. Please check your API permissions.');
      } else if (apiError.response?.status === 401) {
        throw new Error('Google Calendar authentication failed. Please check your credentials.');
      } else {
        throw new Error(`Google Calendar event creation failed: ${apiError.message || 'Unknown error'}`);
      }
    }
    
    if (!event?.data) {
      throw new Error('Google Calendar API returned empty response');
    }
    
    const entryPoints = event.data.conferenceData?.entryPoints as Array<{ entryPointType: string, uri: string }>;
    const join_url = entryPoints?.find((e) => e.entryPointType === 'video')?.uri || '';
    
    if (!join_url) {
      throw new Error('Failed to create Google Meet link: No video entry point found');
    }
    
    const id = event.data.id || '';
    if (!id) {
      throw new Error('Failed to create Google Meet event: No event ID returned');
    }
    
    console.log(`Successfully created Google Meet with ID: ${id}`);
    return { join_url, id };
  } catch (error) {
    console.error('Error creating Google Meet:', error);
    throw error; // Re-throw to allow retry mechanism to work
  }
}

export async function google_add_user_to_meeting(eventId: string, email: string, name?: string) {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }
  const jwtClient = new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  await jwtClient.authorize();
  const calendar = google.calendar({ version: 'v3', auth: jwtClient });

  const event = await calendar.events.get({
    calendarId: GOOGLE_CALENDAR_ID,
    eventId: eventId,
    auth: jwtClient
  });

  const attendees = event.data.attendees || [];
  attendees.push({ email, displayName: name || email.split('@')[0] });

  await calendar.events.patch({
    calendarId: GOOGLE_CALENDAR_ID,
    eventId: eventId,
    requestBody: {
      attendees
    },
    auth: jwtClient
  });
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
 * @param args.platform 'google-meet' | 'zoom'
 * @param args.date ISO date string (YYYY-MM-DD)
 * @param args.startTime string (HH:MM, 24-hour format)
 * @param args.duration number (minutes)
 * @param args.meetingTitle optional title for the meeting
 * @param args.meetingDesc optional description for the meeting
 * @returns Meeting record
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

  if (platform === 'google-meet') {
    const { join_url, id } = await google_create_meet({ date, startTime, duration });
    meetingLink = join_url;
    googleEventId = id;  
  } 
  else if (platform === 'zoom') {
    const response = await zoom_create_meet({ date, startTime, duration });
    meetingLink = response.join_url;
    zoomMeetingId = response.id?.toString();
    
    // The start_url is in the response data, not in the id
    if (response.start_url) {
      zoomStartUrl = response.start_url;
    }
  }

  const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + duration);
  const meeting = await prisma.meeting.create({
    data: {
      meetingDate: new Date(date),
      platform,
      meetingLink,
      startTime: startDateTime,
      endTime: endDateTime,
      createdBy: 'admin',
      meetingTitle: meetingTitle || 'GOALETE Club Session',
      meetingDesc: meetingDesc || 'Join us for a GOALETE Club session to learn how to achieve any goal in life.',
      googleEventId,
      zoomMeetingId,
      zoomStartUrl
    },
    include: { users: true }
  });
  
  // Add special emails from env variables to the meeting
  const specialEmails = getSpecialEmails();
  if (specialEmails.length > 0) {
    try {
      // First, check if these users exist, otherwise create them
      for (const email of specialEmails) {
        // Find user with this email
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });
        
        // If user doesn't exist, create a placeholder user
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email,
              firstName: 'Special',
              lastName: 'User',
              phone: '0000000000',
              source: 'system',
              role: 'admin'
            }
          });
        }
      }
      
      // Get users for these emails
      const specialUsers = await prisma.user.findMany({
        where: {
          email: {
            in: specialEmails
          }
        }
      });
      
      // Add these users to the meeting
      if (specialUsers.length > 0) {
        const specialUserIds = specialUsers.map(user => user.id);
        await updateMeetingWithUsers(meeting.id, specialUserIds);
        
        // Fetch the updated meeting to return
        const updatedMeeting = await prisma.meeting.findUnique({
          where: { id: meeting.id },
          include: { users: true }
        });
        
        if (updatedMeeting) {
          return updatedMeeting;
        }
      }
    } catch (error) {
      console.error('Error adding special users to meeting:', error);
      // Continue even if special users couldn't be added
    }
  }
  
  return meeting;
}

/**
 * Core function 2: Update meeting with users
 * This function updates a meeting by adding users both in the platform and in the database
 * @param meetingId database ID of the meeting
 * @param userIds array of user IDs to add to the meeting
 * @returns Updated meeting record
 */
export async function updateMeetingWithUsers(
  meetingId: string, 
  userIds: string[]
): Promise<MeetingWithUsers> {
  // Fetch the meeting to check platform
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { users: true }
  });
  
  if (!meeting) {
    throw new Error(`Meeting with ID ${meetingId} not found`);
  }
  
  // Add users to the platform's meeting
  for (const userId of userIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true }
    });
    
    if (!user?.email) continue;
    
    const name = user.firstName 
      ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) 
      : user.email.split('@')[0];
    
    if (meeting.platform === 'google-meet' && meeting.googleEventId) {
      await google_add_user_to_meeting(meeting.googleEventId, user.email, name);
    } else if (meeting.platform === 'zoom' && meeting.zoomMeetingId) {
      await zoom_add_user_to_meeting(meeting.zoomMeetingId, user.email, name);
    }
  }
  
  // Update the meeting in the database with the users
  const updatedMeeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      users: {
        connect: userIds.map(id => ({ id }))
      }
    },
    include: { users: true }
  });
  
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
 * This is a convenience function that combines createMeeting and updateMeetingWithUsers
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
  // Create the meeting
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
