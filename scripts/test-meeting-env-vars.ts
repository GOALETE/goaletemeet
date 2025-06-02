// Test script to verify environment variable usage for meeting settings
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function testMeetingDefaults() {
  try {
    console.log('===== Testing environment variable defaults for meeting settings =====');

    // Log all relevant environment variables
    console.log('\nMeeting Configuration Variables:');
    console.log(`DEFAULT_MEETING_PLATFORM: ${process.env.DEFAULT_MEETING_PLATFORM || 'not set'}`);
    console.log(`DEFAULT_MEETING_TIME: ${process.env.DEFAULT_MEETING_TIME || 'not set'}`);
    console.log(`DEFAULT_MEETING_DURATION: ${process.env.DEFAULT_MEETING_DURATION || 'not set'}`);
    
    console.log('\nGoogle Meet API Credentials:');
    console.log(`GOOGLE_CLIENT_EMAIL: ${process.env.GOOGLE_CLIENT_EMAIL ? 'Set ✓' : 'Not set ✗'}`);
    console.log(`GOOGLE_PRIVATE_KEY: ${process.env.GOOGLE_PRIVATE_KEY ? 'Set ✓ (length: ' + process.env.GOOGLE_PRIVATE_KEY.length + ')' : 'Not set ✗'}`);
    console.log(`GOOGLE_CALENDAR_ID: ${process.env.GOOGLE_CALENDAR_ID || 'not set'}`);
    
    console.log('\nZoom API Credentials:');
    console.log(`ZOOM_JWT_TOKEN: ${process.env.ZOOM_JWT_TOKEN ? 'Set ✓ (length: ' + process.env.ZOOM_JWT_TOKEN.length + ')' : 'Not set ✗'}`);
    console.log(`ZOOM_USER_ID: ${process.env.ZOOM_USER_ID || 'not set'}`);

    // Get default meeting settings from environment variables with fallbacks
    const defaultPlatform = process.env.DEFAULT_MEETING_PLATFORM || "google-meet";
    const defaultTime = process.env.DEFAULT_MEETING_TIME || "21:00"; // format: "HH:MM"
    const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || "60"); // minutes
    
    // Parse default time from HH:MM format
    const [hours, minutes] = defaultTime.split(':').map(Number);
    
    // Create a date for testing
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate start time
    const startTime = new Date(today);
    startTime.setHours(hours, minutes, 0, 0);
    
    // Calculate end time
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + defaultDuration);
      console.log('\nCalculated meeting parameters:');
    console.log(`Platform: ${defaultPlatform}`);
    console.log(`Start time: ${startTime.toLocaleTimeString()}`);
    console.log(`End time: ${endTime.toLocaleTimeString()}`);
    console.log(`Duration: ${defaultDuration} minutes`);
    
    // Verify platform settings based on environment
    if (defaultPlatform === "google-meet") {
      console.log('\nTesting Google Meet configuration:');
      if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.log('❌ WARNING: Google Meet is the default platform but API credentials are missing!');
      } else {
        console.log('✅ Google Meet API credentials are properly configured');
      }
    } else if (defaultPlatform === "zoom") {
      console.log('\nTesting Zoom configuration:');
      if (!process.env.ZOOM_JWT_TOKEN || !process.env.ZOOM_USER_ID) {
        console.log('❌ WARNING: Zoom is the default platform but API credentials are missing!');
      } else {
        console.log('✅ Zoom API credentials are properly configured');
      }
    }
    
    // Test creating a meeting
    const meetingLink = defaultPlatform === "zoom" 
      ? `https://zoom.us/j/goalete-test-${Date.now().toString(36)}`
      : `https://meet.google.com/goalete-test-${Date.now().toString(36)}`;
    
    // Create test meeting (but don't save to database)
    const testMeeting = {
      meetingDate: today,
      platform: defaultPlatform,
      meetingLink,
      startTime,
      endTime,
      createdBy: "test-script",
      isDefault: true,
      meetingDesc: "Test meeting using environment variables",
      meetingTitle: "Test Meeting"
    };

    console.log('\nTest meeting object:');
    console.log(JSON.stringify(testMeeting, null, 2));

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMeetingDefaults();
