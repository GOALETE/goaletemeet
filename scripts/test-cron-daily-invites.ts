// Test script for the daily cron job that sends meeting invites
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { getOrCreateDailyMeetingLink } from '../lib/subscription';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

/**
 * This script tests the cron job functionality that:
 * 1. Gets or creates a meeting for today
 * 2. Finds all active subscriptions
 * 3. Sends meeting invites to all users with active subscriptions
 */

async function testDailyMeetingCreation() {
  console.log('===== Testing Daily Meeting Creation =====');
  try {
    // 1. Manually trigger the getOrCreateDailyMeetingLink function
    console.log('Creating or getting daily meeting link...');
    const meeting = await getOrCreateDailyMeetingLink();
    
    if (!meeting) {
      console.error('❌ Failed to create daily meeting');
      return null;
    }
    
    console.log('✅ Successfully created/retrieved daily meeting:');
    console.log(`- Date: ${new Date(meeting.meetingDate).toLocaleDateString()}`);
    console.log(`- Platform: ${meeting.platform}`);
    console.log(`- Link: ${meeting.meetingLink}`);
    console.log(`- Title: ${meeting.meetingTitle}`);
    console.log(`- Start Time: ${new Date(meeting.startTime).toLocaleTimeString()}`);
    console.log(`- User Count: ${meeting.users?.length || 0}`);
    
    if (meeting.platform === 'google-meet' && meeting.googleEventId) {
      console.log(`- Google Event ID: ${meeting.googleEventId}`);
    } else if (meeting.platform === 'zoom' && meeting.zoomMeetingId) {
      console.log(`- Zoom Meeting ID: ${meeting.zoomMeetingId}`);
      if (meeting.zoomStartUrl) {
        console.log(`- Zoom Start URL available: Yes`);
      }
    }
    
    return meeting;
  } catch (error) {
    console.error('Error testing daily meeting creation:', error);
    return null;
  }
}

async function testCronEndpoint() {
  console.log('\n===== Testing Cron Job Endpoint =====');
  try {
    // Use localhost for development testing
    const cronUrl = 'http://localhost:3000/api/cron-daily-invites';
    
    console.log(`Calling cron endpoint: ${cronUrl}`);
    const response = await fetch(cronUrl, {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.error(`❌ Cron endpoint failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Cron job executed successfully');
    
    if (data.todayMeeting) {
      console.log(`- Today's meeting: ${new Date(data.todayMeeting.meetingDate).toLocaleDateString()}`);
      console.log(`- Platform: ${data.todayMeeting.platform}`);
      console.log(`- Link: ${data.todayMeeting.meetingLink}`);
    }
    
    if (data.invitesSent) {
      const successCount = data.invitesSent.filter((i: any) => i.status === 'sent').length;
      console.log(`- Invites sent: ${successCount}/${data.invitesSent.length}`);
      
      if (successCount > 0) {
        console.log('\nSuccessful invites:');
        data.invitesSent
          .filter((i: any) => i.status === 'sent')
          .forEach((invite: any, index: number) => {
            console.log(`${index + 1}. ${invite.email} (${invite.planType})`);
          });
      }
      
      const failedCount = data.invitesSent.filter((i: any) => i.status === 'failed').length;
      if (failedCount > 0) {
        console.log('\nFailed invites:');
        data.invitesSent
          .filter((i: any) => i.status === 'failed')
          .forEach((invite: any, index: number) => {
            console.log(`${index + 1}. ${invite.email} - Error: ${invite.error}`);
          });
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error testing cron endpoint:', error);
    return null;
  }
}

async function runTests() {
  try {
    await testDailyMeetingCreation();
    await testCronEndpoint();
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
