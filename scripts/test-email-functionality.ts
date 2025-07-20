/**
 * Test email functionality with different scenarios
 * Run with: npm run test:email-functionality
 */
import * as dotenv from 'dotenv';
import { 
  sendEmail, 
  sendEmailWithRetry, 
  sendMeetingInvite,
  sendWelcomeEmail 
} from '../lib/email';

// Load environment variables
dotenv.config();

async function runTests() {
  console.log('==================================');
  console.log('  GOALETE EMAIL FUNCTIONALITY TEST');
  console.log('==================================\n');
  
  const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER;
  
  if (!testEmail) {
    console.error('❌ TEST_EMAIL environment variable is not set');
    process.exit(1);
  }
  
  console.log(`Using test email: ${testEmail}\n`);
  
  // Test 1: Basic email
  console.log('Test 1: Basic email with retry mechanism');
  const basicEmailResult = await sendEmailWithRetry({
    to: testEmail,
    subject: 'GOALETE Test - Basic Email',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Test Email</h1>
        <p>This is a test of the basic email functionality with retry mechanism.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>
    `
  });
  
  console.log(`Basic email result: ${basicEmailResult ? '✅ Success' : '❌ Failed'}\n`);
  
  // Test 2: Meeting invite
  console.log('Test 2: Meeting invite with calendar attachment');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(21, 0, 0, 0); // 9 PM
  
  const meetingEndTime = new Date(tomorrow);
  meetingEndTime.setHours(22, 0, 0, 0); // 10 PM
  
  const meetingInviteResult = await sendMeetingInvite({
    recipient: {
      name: 'Test User',
      email: testEmail
    },
    meetingTitle: 'TEST - GOALETE Club Session',
    meetingDescription: 'This is a test meeting invite. Please ignore.',
    meetingLink: 'https://meet.google.com/test-meeting-link',
    startTime: tomorrow,
    endTime: meetingEndTime,
    platform: 'Google Meet'
  });
  
  console.log(`Meeting invite result: ${meetingInviteResult ? '✅ Success' : '❌ Failed'}\n`);
  
  // Test 3: Welcome email
  console.log('Test 3: Welcome email');
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  
  const welcomeEmailResult = await sendWelcomeEmail({
    recipient: {
      name: 'Test User',
      email: testEmail
    },
    planType: 'monthly',
    startDate,
    endDate,
    amount: 2999,
    paymentId: 'TEST123456789'
  });
  
  console.log(`Welcome email result: ${welcomeEmailResult ? '✅ Success' : '❌ Failed'}\n`);
  
  console.log('==================================');
  console.log('  EMAIL TESTS COMPLETED');
  console.log('==================================');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
