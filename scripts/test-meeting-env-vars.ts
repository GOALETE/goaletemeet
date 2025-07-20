// Test script to verify environment variable usage for meeting settings
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function testMeetingDefaults() {
  try {
    console.log('Testing environment variable defaults for meeting settings');

    // Log the environment variables
    console.log('Environment variables:');
    console.log(`DEFAULT_MEETING_PLATFORM: ${process.env.DEFAULT_MEETING_PLATFORM || 'not set'}`);
    console.log(`DEFAULT_MEETING_TIME: ${process.env.DEFAULT_MEETING_TIME || 'not set'}`);
    console.log(`DEFAULT_MEETING_DURATION: ${process.env.DEFAULT_MEETING_DURATION || 'not set'}`);

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
