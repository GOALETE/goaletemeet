/**
 * Email test script for GoaleteMeet
 * 
 * This script tests the email functionality by sending a test welcome email and meeting invite
 * Run with: npx tsx scripts/test-email.ts
 */
import { sendWelcomeEmail, sendMeetingInvite } from '../lib/email';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('ERROR: EMAIL_USER and EMAIL_PASSWORD environment variables must be set.');
  console.error('Please update your .env file with proper Gmail SMTP credentials.');
  process.exit(1);
}

// Test email recipient
const recipient = {
  name: 'Test User',
  email: process.env.TEST_EMAIL || process.env.EMAIL_USER, // Default to sending to yourself
};

// Test parameters
const testPlan = 'monthly';
const testStartDate = new Date();
const testEndDate = new Date();
testEndDate.setDate(testEndDate.getDate() + 30); // 30 days from now
const testAmount = 499900; // ₹4999 in paise

// Test meeting parameters
const meetingStartTime = new Date();
meetingStartTime.setHours(20, 0, 0, 0); // 8:00 PM today
const meetingEndTime = new Date(meetingStartTime);
meetingEndTime.setHours(21, 0, 0, 0); // 9:00 PM today

// Function to run the tests
async function runTests() {
  console.log('🔍 Starting email functionality tests...');
  console.log(`📧 Test emails will be sent to: ${recipient.email}`);
  
  try {
    // Test welcome email
    console.log('\n📩 Testing welcome email...');
    const welcomeResult = await sendWelcomeEmail({
      recipient,
      planType: testPlan,
      startDate: testStartDate,
      endDate: testEndDate,
      amount: testAmount
    });
    
    if (welcomeResult) {
      console.log('✅ Welcome email sent successfully!');
    } else {
      console.error('❌ Failed to send welcome email.');
    }
    
    // Test meeting invite (Google Meet)
    console.log('\n📅 Testing Google Meet meeting invite...');
    const googleMeetResult = await sendMeetingInvite({
      recipient,
      meetingTitle: 'Test Google Meet Session',
      meetingDescription: 'This is a test meeting invite for Google Meet.',
      meetingLink: 'https://meet.google.com/test-meet-link',
      startTime: meetingStartTime,
      endTime: meetingEndTime,
      platform: 'Google Meet'
    });
    
    if (googleMeetResult) {
      console.log('✅ Google Meet invite sent successfully!');
    } else {
      console.error('❌ Failed to send Google Meet invite.');
    }
    
    // Test meeting invite (Zoom)
    console.log('\n📅 Testing Zoom meeting invite...');
    const zoomResult = await sendMeetingInvite({
      recipient,
      meetingTitle: 'Test Zoom Session',
      meetingDescription: 'This is a test meeting invite for Zoom.',
      meetingLink: 'https://zoom.us/j/test-zoom-link',
      startTime: meetingStartTime,
      endTime: meetingEndTime,
      platform: 'Zoom'
    });
    
    if (zoomResult) {
      console.log('✅ Zoom invite sent successfully!');
    } else {
      console.error('❌ Failed to send Zoom invite.');
    }
    
    console.log('\n🔍 Test summary:');
    console.log(`- Welcome email: ${welcomeResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`- Google Meet invite: ${googleMeetResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`- Zoom invite: ${zoomResult ? '✅ Success' : '❌ Failed'}`);
    
    if (welcomeResult && googleMeetResult && zoomResult) {
      console.log('\n🎉 All tests passed successfully!');
      console.log('Please check your inbox to verify the emails were received and formatted correctly.');
    } else {
      console.error('\n❌ Some tests failed. Please check the error messages above.');
    }
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the tests
runTests();
