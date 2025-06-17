/**
 * Comprehensive test for meeting creation, scheduling, and user management
 * Run with: npm run test:meeting-management
 */
import * as dotenv from 'dotenv';
import { 
  createMeetingLink, 
  createMeetingLinkWithRetry,
  createCompleteMeeting,
  getOrCreateMeetingForDate
} from '../lib/meetingLink';
import { 
  checkActiveSubscription,
  canUserSubscribe,
  canUserSubscribeForDates
} from '../lib/subscription';

// Load environment variables
dotenv.config();

const DEFAULT_TEST_EMAIL = 'test@goalete.com';

/**
 * Run tests in sequence with proper error handling
 */
async function runTests() {
  console.log('============================================');
  console.log('  GOALETE MEETING MANAGEMENT TEST SUITE     ');
  console.log('============================================\n');
  
  let hasErrors = false;
  const testResults: Array<{name: string, passed: boolean, error?: any}> = [];
  
  // Run each test and track results
  async function runTest(name: string, testFn: () => Promise<void>) {
    console.log(`\nRunning test: ${name}`);
    console.log('-'.repeat(40));
    
    try {
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      testResults.push({ name, passed: true });
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(error);
      testResults.push({ name, passed: false, error });
      hasErrors = true;
    }
  }
  
  // Test 1: Basic Meeting Link Creation
  await runTest('Basic Meeting Link Creation', async () => {
    const platform = process.env.DEFAULT_MEETING_PLATFORM as 'google-meet' | 'zoom' || 'google-meet';
    const today = new Date();
    const date = today.toISOString().split('T')[0];
    const startTime = '21:00';
    const duration = 60;
    
    console.log(`Creating meeting link for ${platform} on ${date} at ${startTime}`);
    
    const meetingLink = await createMeetingLinkWithRetry({
      platform,
      date,
      startTime,
      duration
    });
    
    console.log(`Meeting link created: ${meetingLink}`);
    
    if (!meetingLink || !meetingLink.startsWith('http')) {
      throw new Error(`Invalid meeting link: ${meetingLink}`);
    }
  });
  
  // Test 2: Complete Meeting Creation
  await runTest('Complete Meeting Creation', async () => {
    const platform = process.env.DEFAULT_MEETING_PLATFORM as 'google-meet' | 'zoom' || 'google-meet';
    const today = new Date();
    const date = today.toISOString().split('T')[0];
    const startTime = '22:00';
    const duration = 45;
    
    console.log(`Creating complete meeting for ${platform} on ${date} at ${startTime}`);
    
    const meeting = await createCompleteMeeting({
      platform,
      date,
      startTime,
      duration,
      meetingTitle: 'Test Meeting',
      meetingDesc: 'This is a test meeting',
      userIds: [] // No users for this test
    });
    
    console.log(`Complete meeting created`);
    console.log(`- Date: ${new Date(meeting.meetingDate).toDateString()}`);
    console.log(`- Link: ${meeting.meetingLink}`);
    console.log(`- Platform: ${meeting.platform}`);
    
    if (!meeting.meetingLink || !meeting.meetingLink.startsWith('http')) {
      throw new Error(`Invalid meeting link: ${meeting.meetingLink}`);
    }
  });
  
  // Test 3: Meeting Date Management
  await runTest('Meeting Date Management', async () => {
    const today = new Date();
    const date = today.toISOString().split('T')[0];
    
    console.log(`Testing getOrCreateMeetingForDate for ${date}`);
    
    const meeting = await getOrCreateMeetingForDate(date);
    
    if (!meeting) {
      throw new Error('Meeting creation failed');
    }
    
    console.log(`Meeting for date ${date} created or retrieved successfully`);
    console.log(`- Link: ${meeting.meetingLink}`);
    console.log(`- Start: ${meeting.startTime.toLocaleTimeString()}`);
    console.log(`- End: ${meeting.endTime.toLocaleTimeString()}`);
  });
  
  // Test 4: Subscription Validation
  await runTest('Subscription Validation', async () => {
    const email = DEFAULT_TEST_EMAIL;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);
    
    console.log(`Testing subscription validation for ${email}`);
    
    const subStatus = await canUserSubscribe(email);
    console.log(`User can subscribe: ${subStatus.canSubscribe}`);
    
    const dateSubStatus = await canUserSubscribeForDates(
      email,
      today,
      futureDate
    );
    console.log(`User can subscribe for specific dates: ${dateSubStatus.canSubscribe}`);
    
    // This is just a validation test, so no assertions needed
  });
  
  // Print summary
  console.log('\n============================================');
  console.log('  TEST SUMMARY                              ');
  console.log('============================================');
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  
  console.log(`Total tests: ${testResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`- ${t.name}`);
    });
    
    process.exit(1);
  } else {
    console.log('\nAll tests passed successfully!');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});
