// Test script to verify Google Meet and Zoom API integration
import { createMeetingWithUsers, addUserToMeeting, google_create_meet, zoom_create_meet } from '../lib/meetingLink';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { MeetingWithUsers } from '../types/meeting';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Helper function to log test results
function logTest(name: string, success: boolean, result: any = null, error: Error | unknown = null) {
  console.log(`\n----- Test: ${name} -----`);
  console.log(`Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
  if (result) {
    console.log('Result:', typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
  }
  if (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

async function testMeetingCreation() {
  console.log('======= TESTING MEETING CREATION AND USER MANAGEMENT =======');
  
  // Verify environment variables are set
  console.log('\nEnvironment Variables:');
  console.log(`GOOGLE_CLIENT_EMAIL: ${process.env.GOOGLE_CLIENT_EMAIL ? 'Set ✓' : 'Not set ✗'}`);
  console.log(`GOOGLE_PRIVATE_KEY: ${process.env.GOOGLE_PRIVATE_KEY ? 'Set ✓' : 'Not set ✗'}`);
  console.log(`GOOGLE_CALENDAR_ID: ${process.env.GOOGLE_CALENDAR_ID ? 'Set ✓' : 'Not set ✗'}`);
  console.log(`ZOOM_JWT_TOKEN: ${process.env.ZOOM_JWT_TOKEN ? 'Set ✓' : 'Not set ✗'}`);
  console.log(`ZOOM_USER_ID: ${process.env.ZOOM_USER_ID ? 'Set ✓' : 'Not set ✗'}`);
  
  try {
    // 1. Test Google Meet link creation
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const result = await google_create_meet({
        date: dateStr,
        startTime: '14:00',
        duration: 30
      });
      
      logTest('Google Meet Creation', true, {
        link: result.join_url,
        eventId: result.id
      });
    } catch (error) {
      logTest('Google Meet Creation', false, null, error);
    }
    
    // 2. Test Zoom link creation
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const result = await zoom_create_meet({
        date: dateStr,
        startTime: '15:00',
        duration: 45
      });
      
      logTest('Zoom Meeting Creation', true, {
        link: result.join_url,
        meetingId: result.id,
        startUrl: result.start_url
      });
    } catch (error) {
      logTest('Zoom Meeting Creation', false, null, error);
    }
    
    // 3. Test creating a meeting with users
    try {
      // First, create a test user if needed
      let testUser = await prisma.user.findFirst({
        where: { email: 'test@example.com' }
      });
      
      if (!testUser) {
        testUser = await prisma.user.create({
          data: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '1234567890',
            source: 'test'
          }
        });
        console.log('Created test user:', testUser.id);
      }
      
      // Create a meeting with the test user
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const result = await createMeetingWithUsers({
        platform: 'google-meet',
        date: dateStr,
        startTime: '16:00',
        duration: 60,
        userIds: [testUser.id],
        meetingTitle: 'Test Meeting with Users',
        meetingDesc: 'This is a test meeting created by the test script'
      });
      
      logTest('Create Meeting with Users', true, {
        meetingId: result.id,
        link: result.meetingLink,
        platform: result.platform,
        userCount: result.users.length,
        googleEventId: result.googleEventId
      });
      
      // Store the meeting ID for the next test
      return result.id;
    } catch (error) {
      logTest('Create Meeting with Users', false, null, error);
      return null;
    }
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

async function testAddUserToMeeting(meetingId: string | null) {
  if (!meetingId) {
    logTest('Add User to Meeting', false, null, 'No meeting ID provided from previous test');
    return;
  }
  
  try {
    // Create a second test user
    let secondUser = await prisma.user.findFirst({
      where: { email: 'second-test@example.com' }
    });
    
    if (!secondUser) {
      secondUser = await prisma.user.create({
        data: {
          firstName: 'Second',
          lastName: 'User',
          email: 'second-test@example.com',
          phone: '0987654321',
          source: 'test'
        }
      });
      console.log('Created second test user:', secondUser.id);
    }
    
    // Add the second user to the meeting
    const result = await addUserToMeeting(meetingId, secondUser.id);
    
    logTest('Add User to Meeting', true, {
      meetingId: result.id,
      userCount: result.users.length,
      updatedAt: result.updatedAt
    });
  } catch (error) {
    logTest('Add User to Meeting', false, null, error);
  }
}

async function runTests() {
  try {
    const meetingId = await testMeetingCreation();
    if (meetingId) {
      await testAddUserToMeeting(meetingId);
    }
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
