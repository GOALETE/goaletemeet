import prisma from './prisma';
import axios from 'axios';
import { google } from 'googleapis';

/**
 * Create a meeting link for the given platform, date, and timeslot.
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
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }

  const jwtClient = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/calendar']
  );
  await jwtClient.authorize();
  const calendar = google.calendar({ version: 'v3', auth: jwtClient });

  const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + duration);

  const event = await calendar.events.insert({
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
  const entryPoints = event.data.conferenceData?.entryPoints as Array<{ entryPointType: string, uri: string }>;
  const join_url = entryPoints?.find((e) => e.entryPointType === 'video')?.uri || '';
  
  if (!join_url) {
    throw new Error('Failed to create Google Meet link: No video entry point found');
  }
  
  const id = event.data.id || '';
  if (!id) {
    throw new Error('Failed to create Google Meet event: No event ID returned');
  }
  
  return { join_url, id };
}

export async function google_add_user_to_meeting(eventId: string, email: string, name?: string) {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Meet API credentials are not set');
  }

  const jwtClient = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/calendar']
  );
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

export async function zoom_create_meet({ date, startTime, duration }: { date: string, startTime: string, duration: number }): Promise<{ join_url: string, id: string, start_url: string }> {
  const ZOOM_JWT_TOKEN = process.env.ZOOM_JWT_TOKEN;
  const ZOOM_USER_ID = process.env.ZOOM_USER_ID;
  
  if (!ZOOM_JWT_TOKEN || !ZOOM_USER_ID) {
    throw new Error('Zoom API credentials are not set');
  }
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
          'Authorization': `Bearer ${ZOOM_JWT_TOKEN}`,
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
 * Create a meeting and attach invited users.
 * @param args.platform 'google-meet' | 'zoom'
 * @param args.date ISO date string (YYYY-MM-DD)
 * @param args.startTime string (HH:MM, 24-hour format)
 * @param args.duration number (minutes)
 * @param args.userIds string[] (user IDs to invite)
 * @returns Meeting record
 */
export async function createMeetingWithUsers({
  platform,
  date,
  startTime,
  duration,
  userIds,
  meetingTitle,
  meetingDesc
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number,
  userIds: string[],
  meetingTitle?: string,
  meetingDesc?: string
}) {
  let meetingLink = '';
  let googleEventId: string | undefined = undefined;
  let zoomMeetingId: string | undefined = undefined;
  let zoomStartUrl: string | undefined = undefined;

  if (platform === 'google-meet') {
    const { join_url, id } = await google_create_meet({ date, startTime, duration });
    meetingLink = join_url;
    googleEventId = id;  } else if (platform === 'zoom') {
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
      users: {
        connect: userIds.map(id => ({ id }))
      },
      googleEventId,
      zoomMeetingId,
      zoomStartUrl
    },
    include: { users: true }
  });
  return meeting;
}

/**
 * Add a user to an existing meeting's invited list.
 * @param meetingId string
 * @param userId string
 * @returns Updated meeting
 */
export async function addUserToMeeting(meetingId: string, userId: string) {
  // Update the meeting in the database
  const updatedMeeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      users: {
        connect: { id: userId }
      }
    },
    include: { users: true }
  });

  // If the meeting is a Zoom meeting, add the user as a registrant
  if (updatedMeeting.platform === 'zoom' && updatedMeeting.zoomMeetingId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true }
    });
    if (user?.email) {
      const name = user.firstName ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) : user.email.split('@')[0];
      await zoom_add_user_to_meeting(updatedMeeting.zoomMeetingId, user.email, name);
    }
  } else if (updatedMeeting.platform === 'google-meet' && updatedMeeting.googleEventId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true }
    });
    if (user?.email) {
      const name = user.firstName ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) : user.email.split('@')[0];
      await google_add_user_to_meeting(updatedMeeting.googleEventId, user.email, name);
    }
  }
  return updatedMeeting;
}

/**
 * Add a user (by email) as a registrant to a Zoom meeting.
 * @param meetingId Zoom meeting ID
 * @param email User's email to invite
 * @param name User's name (optional)
 * @returns Zoom API response
 */
export async function zoom_add_user_to_meeting(meetingId: string, email: string, name?: string) {
  const ZOOM_JWT_TOKEN = process.env.ZOOM_JWT_TOKEN;
  
  if (!ZOOM_JWT_TOKEN) {
    throw new Error('Zoom API credentials are not set');
  }
  try {
    const response = await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
      {
        email,
        first_name: name || email.split('@')[0]
      },
      {
        headers: {
          'Authorization': `Bearer ${ZOOM_JWT_TOKEN}`,
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
