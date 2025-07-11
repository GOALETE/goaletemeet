// tester/adminMeetingsTest.ts
// External tester for admin meetings API

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { MeetingWithUsers } from '../types/meeting';

// Load environment variables from .env file
dotenv.config();

// Define types for API responses
interface Meeting extends MeetingWithUsers {
  // Already inherits all fields from MeetingWithUsers
}

interface CreateMeetingResponse {
  message: string;
  meetings: Meeting[];
}

interface GetMeetingsResponse {
  meetings: Meeting[];
}

const API_URL = 'http://localhost:3000/api/admin/meetings';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'your_admin_passcode';

async function createMeetings() {
  // Generate a date for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`Creating test meeting for date: ${tomorrowStr}`);
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_PASSCODE}`
    },
    body: JSON.stringify({
      dates: [tomorrowStr],
      platform: process.env.DEFAULT_MEETING_PLATFORM || 'google-meet',      startTime: process.env.DEFAULT_MEETING_TIME || '21:00',
      duration: parseInt(process.env.DEFAULT_MEETING_DURATION || '60'),
      meetingTitle: 'Test Meeting API',
      meetingDesc: 'This is a test meeting.'
    })
  });
  
  if (!res.ok) {
    console.error(`Failed to create meeting: ${res.status} ${res.statusText}`);
    const errorText = await res.text();
    console.error('Error details:', errorText);
    return null;
  }

  const data = await res.json();
  console.log('✅ Meeting created successfully!');
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function getMeetings() {
  // Create date range for this week
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7); // One week ago
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 14); // Two weeks from now
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  console.log(`Fetching meetings from ${startDateStr} to ${endDateStr}`);
  
  const queryParams = new URLSearchParams({
    startDate: startDateStr,
    endDate: endDateStr,
    platform: 'all'
  });
  
  const url = `${API_URL}?${queryParams.toString()}`;
  const res = await fetch(url, {
    method: 'GET',    headers: {
      'Authorization': `Bearer ${ADMIN_PASSCODE}`
    }
  });
  const data = await res.json();
  
  if (data.meetings && data.meetings.length > 0) {
    console.log(`Found ${data.meetings.length} meetings:`);
    
    // Format and display meetings
    data.meetings.forEach((meeting: any) => {
      const date = new Date(meeting.meetingDate).toLocaleDateString();
      const platform = meeting.platform;
      const start = new Date(meeting.startTime).toLocaleTimeString();
      const end = new Date(meeting.endTime).toLocaleTimeString();
      
      console.log(`- ${date}: ${meeting.meetingTitle} (${platform}) from ${start} to ${end}`);
      console.log(`  Link: ${meeting.meetingLink}`);
      if (meeting.googleEventId) {
        console.log(`  Google Event ID: ${meeting.googleEventId}`);
      }
      if (meeting.zoomMeetingId) {
        console.log(`  Zoom Meeting ID: ${meeting.zoomMeetingId}`);
        if (meeting.zoomStartUrl) {
          console.log(`  Zoom Host URL: ${meeting.zoomStartUrl}`);
        }
      }
      console.log('');
    });
  } else {
    console.log('No meetings found in the specified date range.');
  }
  
  return data;
}

(async () => {
  await createMeetings();
  await getMeetings();
})();
