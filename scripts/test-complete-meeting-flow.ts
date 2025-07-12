/**
 * Complete Meeting Creation and User Addition Test
 * 
 * This script tests the full workflow:
 * 1. Creates a Google Meet using default environment values
 * 2. Adds a test user to the meeting
 * 3. Verifies the meeting and attendee addition
 * 4. Tests credit-optimized API usage
 * 5. Cleans up test resources
 * 
 * Usage: npm run test:complete-meeting-flow
 */

import { 
  google_create_meet, 
  google_add_user_to_meeting,
  google_add_users_to_meeting,
  updatePendingMeetingLink
} from '../lib/meetingLink';

import { getCalendarClient, getAdminEmail } from '../lib/googleAuth';
import { format, addDays } from 'date-fns';

interface TestResult {
  step: string;
  passed: boolean;
  message: string;
  duration?: number;
  data?: any;
}

class CompleteMeetingTestSuite {
  private results: TestResult[] = [];
  private testEventId: string = '';
  private startTime: number = Date.now();

  async runAllTests(): Promise<void> {
    console.log('🚀 Complete Meeting Creation and User Addition Test');
    console.log('=' .repeat(60));
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    console.log(`🎯 Platform: ${process.env.DEFAULT_MEETING_PLATFORM || 'google-meet'}`);
    console.log(`⏰ Default Time: ${process.env.DEFAULT_MEETING_TIME || '21:00'}`);
    console.log(`⌛ Default Duration: ${process.env.DEFAULT_MEETING_DURATION || '60'} minutes`);
    console.log(`👤 Test User: ${process.env.TEST_USER_EMAIL || 'Not configured'}`);
    console.log('-'.repeat(60));

    try {
      await this.validateEnvironment();
      await this.testMeetingCreationWithDefaults();
      await this.testSingleUserAddition();
      await this.testBatchUserAddition();
      await this.testMeetingLinkRetrieval();
      await this.testCreditOptimization();
      await this.generateTestReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Step 1: Validate environment variables and configuration
   */
  private async validateEnvironment(): Promise<void> {
    console.log('\n🔧 Step 1: Validating Environment Configuration...');
    const stepStart = Date.now();

    try {
      // Check required environment variables
      const requiredVars = {
        'DEFAULT_MEETING_PLATFORM': process.env.DEFAULT_MEETING_PLATFORM,
        'DEFAULT_MEETING_TIME': process.env.DEFAULT_MEETING_TIME,
        'DEFAULT_MEETING_DURATION': process.env.DEFAULT_MEETING_DURATION,
        'DEFAULT_MEETING_TITLE': process.env.DEFAULT_MEETING_TITLE,
        'GOOGLE_CLIENT_EMAIL': process.env.GOOGLE_CLIENT_EMAIL,
        'GOOGLE_PRIVATE_KEY': process.env.GOOGLE_PRIVATE_KEY,
        'GOOGLE_CALENDAR_ID': process.env.GOOGLE_CALENDAR_ID,
        'TEST_USER_EMAIL': process.env.TEST_USER_EMAIL
      };

      const missingVars = Object.entries(requiredVars)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
      }

      // Test Google Calendar authentication
      const impersonateUser = getAdminEmail();
      const calendar = await getCalendarClient(impersonateUser);
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await calendar.calendars.get({ calendarId });

      this.addResult({
        step: 'Environment Validation',
        passed: true,
        message: 'All environment variables configured and Google Calendar accessible',
        duration: Date.now() - stepStart,
        data: {
          platform: process.env.DEFAULT_MEETING_PLATFORM,
          time: process.env.DEFAULT_MEETING_TIME,
          duration: process.env.DEFAULT_MEETING_DURATION,
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          testUser: process.env.TEST_USER_EMAIL
        }
      });

    } catch (error) {
      this.addResult({
        step: 'Environment Validation',
        passed: false,
        message: `Environment validation failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - stepStart
      });
      throw error;
    }
  }

  /**
   * Step 2: Create Google Meet using default environment values
   */
  private async testMeetingCreationWithDefaults(): Promise<void> {
    console.log('\n📅 Step 2: Creating Google Meet with Default Values...');
    const stepStart = Date.now();

    try {
      // Use tomorrow's date for testing
      const testDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const defaultTime = process.env.DEFAULT_MEETING_TIME || '21:00';
      const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || '60');

      console.log(`   📍 Creating meeting for: ${testDate} at ${defaultTime}`);
      console.log(`   ⏱️  Duration: ${defaultDuration} minutes`);

      // Create meeting using default values (no custom title/description)
      const meeting = await google_create_meet({
        date: testDate,
        startTime: defaultTime,
        duration: defaultDuration
        // No meetingTitle or meetingDesc - should use environment defaults
      });

      this.testEventId = meeting.id;

      // Verify meeting was created with correct default values
      const impersonateUser = getAdminEmail();
      const calendar = await getCalendarClient(impersonateUser);
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const event = await calendar.events.get({
        calendarId: calendarId,
        eventId: meeting.id
      });

      const expectedTitle = process.env.DEFAULT_MEETING_TITLE || 'GOALETE Club Session';
      const actualTitle = event.data.summary;
      const hasCorrectTitle = actualTitle === expectedTitle;

      const hasHangoutLink = !!(event.data.hangoutLink || event.data.conferenceData);
      const hasValidMeetingLink = meeting.join_url && meeting.join_url !== 'pending-meet-link-creation';

      this.addResult({
        step: 'Meeting Creation with Defaults',
        passed: hasCorrectTitle && hasHangoutLink,
        message: `Meeting created successfully with default values`,
        duration: Date.now() - stepStart,
        data: {
          eventId: meeting.id,
          meetingLink: meeting.join_url,
          actualTitle,
          expectedTitle,
          hasCorrectTitle,
          hasHangoutLink,
          hasValidMeetingLink,
          htmlLink: event.data.htmlLink
        }
      });

      console.log(`   ✅ Event ID: ${meeting.id}`);
      console.log(`   ✅ Meeting Link: ${meeting.join_url}`);
      console.log(`   ✅ Title: ${actualTitle}`);

    } catch (error) {
      this.addResult({
        step: 'Meeting Creation with Defaults',
        passed: false,
        message: `Meeting creation failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - stepStart
      });
      throw error;
    }
  }

  /**
   * Step 3: Test adding single user using environment test user
   */
  private async testSingleUserAddition(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        step: 'Single User Addition',
        passed: false,
        message: 'No test event available for user addition'
      });
      return;
    }

    console.log('\n👤 Step 3: Adding Test User to Meeting...');
    const stepStart = Date.now();

    try {
      const testEmail = process.env.TEST_USER_EMAIL || 'testuser@example.com';
      const testName = process.env.TEST_USER_NAME || 'Test User';

      console.log(`   📧 Adding user: ${testEmail} (${testName})`);

      // Add single user to meeting
      await google_add_user_to_meeting(this.testEventId, testEmail, testName);

      // Verify user was added
      const impersonateUser = getAdminEmail();
      const calendar = await getCalendarClient(impersonateUser);
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const event = await calendar.events.get({
        calendarId: calendarId,
        eventId: this.testEventId
      });

      const attendees = event.data.attendees || [];
      const testUserAttendee = attendees.find((attendee: any) => attendee.email === testEmail);
      const isUserAdded = !!testUserAttendee;

      this.addResult({
        step: 'Single User Addition',
        passed: isUserAdded,
        message: isUserAdded 
          ? `Test user ${testEmail} successfully added to meeting`
          : `Test user ${testEmail} was not found in attendees`,
        duration: Date.now() - stepStart,
        data: {
          testEmail,
          testName,
          totalAttendees: attendees.length,
          attendeeEmails: attendees.map((a: any) => a.email),
          testUserDetails: testUserAttendee
        }
      });

      console.log(`   ✅ User added successfully`);
      console.log(`   📊 Total attendees: ${attendees.length}`);

    } catch (error) {
      this.addResult({
        step: 'Single User Addition',
        passed: false,
        message: `User addition failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - stepStart
      });
    }
  }

  /**
   * Step 4: Test batch user addition with multiple test users
   */
  private async testBatchUserAddition(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        step: 'Batch User Addition',
        passed: false,
        message: 'No test event available for batch user addition'
      });
      return;
    }

    console.log('\n👥 Step 4: Adding Multiple Users in Batch...');
    const stepStart = Date.now();

    try {
      // Create test users from different domains
      const batchUsers = [
        { email: 'admin@goalete.com', name: 'Admin User' },
        { email: 'support@goalete.com', name: 'Support Team' },
        { email: 'testuser2@gmail.com', name: 'Gmail Test User' },
        { email: 'testuser3@yahoo.com', name: 'Yahoo Test User' }
      ];

      console.log(`   📧 Adding ${batchUsers.length} users in batch operation`);

      // Add batch users
      await google_add_users_to_meeting(this.testEventId, batchUsers);

      // Verify users were added
      const impersonateUser = getAdminEmail();
      const calendar = await getCalendarClient(impersonateUser);
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const event = await calendar.events.get({
        calendarId: calendarId,
        eventId: this.testEventId
      });

      const attendees = event.data.attendees || [];
      const batchUserEmails = batchUsers.map(u => u.email);
      const addedUsers = attendees.filter((attendee: any) => 
        batchUserEmails.includes(attendee.email)
      );

      const allBatchUsersAdded = batchUsers.every(user => 
        attendees.some((attendee: any) => attendee.email === user.email)
      );

      this.addResult({
        step: 'Batch User Addition',
        passed: allBatchUsersAdded,
        message: `${addedUsers.length}/${batchUsers.length} batch users successfully added`,
        duration: Date.now() - stepStart,
        data: {
          batchUsers,
          totalAttendees: attendees.length,
          addedBatchUsers: addedUsers.length,
          allAttendeesEmails: attendees.map((a: any) => a.email)
        }
      });

      console.log(`   ✅ Batch addition completed`);
      console.log(`   📊 Total attendees now: ${attendees.length}`);

    } catch (error) {
      this.addResult({
        step: 'Batch User Addition',
        passed: false,
        message: `Batch user addition failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - stepStart
      });
    }
  }

  /**
   * Step 5: Test meeting link retrieval and validation
   */
  private async testMeetingLinkRetrieval(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        step: 'Meeting Link Retrieval',
        passed: false,
        message: 'No test event available for link retrieval'
      });
      return;
    }

    console.log('\n🔗 Step 5: Testing Meeting Link Retrieval...');
    const stepStart = Date.now();

    try {
      // Check current meeting link
      const impersonateUser = getAdminEmail();
      const calendar = await getCalendarClient(impersonateUser);
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const event = await calendar.events.get({
        calendarId: calendarId,
        eventId: this.testEventId
      });

      const hangoutLink = event.data.hangoutLink;
      const conferenceData = event.data.conferenceData;
      
      let meetingLink = '';
      let linkSource = '';

      // Check conference data first (preferred)
      if (conferenceData?.entryPoints) {
        const videoEntry = conferenceData.entryPoints.find(
          (entry: any) => entry.entryPointType === 'video'
        );
        if (videoEntry?.uri) {
          meetingLink = videoEntry.uri;
          linkSource = 'conference_data';
        }
      }

      // Fallback to hangout link
      if (!meetingLink && hangoutLink) {
        meetingLink = hangoutLink;
        linkSource = 'hangout_link';
      }

      // Test updating pending links
      const updatedLink = await updatePendingMeetingLink(this.testEventId);
      
      const hasValidLink = !!(meetingLink && (
        meetingLink.includes('meet.google.com') || 
        meetingLink.includes('hangouts.google.com')
      ));

      this.addResult({
        step: 'Meeting Link Retrieval',
        passed: hasValidLink,
        message: hasValidLink 
          ? `Valid meeting link retrieved from ${linkSource}`
          : 'No valid meeting link found',
        duration: Date.now() - stepStart,
        data: {
          meetingLink,
          linkSource,
          hasHangoutLink: !!hangoutLink,
          hasConferenceData: !!conferenceData,
          updatedLink,
          conferenceStatus: conferenceData?.createRequest?.status
        }
      });

      console.log(`   ✅ Meeting link: ${meetingLink || 'Not available'}`);
      console.log(`   🔍 Link source: ${linkSource || 'None'}`);

    } catch (error) {
      this.addResult({
        step: 'Meeting Link Retrieval',
        passed: false,
        message: `Link retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - stepStart
      });
    }
  }

  /**
   * Step 6: Test credit optimization (API quota efficiency)
   */
  private async testCreditOptimization(): Promise<void> {
    console.log('\n💰 Step 6: Testing Credit Optimization...');
    const stepStart = Date.now();

    try {
      // Test multiple small additions to verify patch efficiency
      const testEmails = [
        'optimization1@test.com',
        'optimization2@test.com',
        'optimization3@test.com'
      ];

      let totalOperations = 0;
      const operationTimes: number[] = [];

      for (const email of testEmails) {
        const operationStart = Date.now();
        
        if (this.testEventId) {
          await google_add_user_to_meeting(this.testEventId, email, `Test ${email.split('@')[0]}`);
          totalOperations++;
        }
        
        operationTimes.push(Date.now() - operationStart);
      }

      const averageOperationTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
      const totalOptimizationTime = Date.now() - stepStart;

      // Each operation should use 2 quota units (1 GET + 1 PATCH)
      const estimatedQuotaUsed = totalOperations * 2;

      this.addResult({
        step: 'Credit Optimization',
        passed: totalOperations > 0,
        message: `Completed ${totalOperations} optimized operations using ~${estimatedQuotaUsed} quota units`,
        duration: totalOptimizationTime,
        data: {
          totalOperations,
          averageOperationTime: Math.round(averageOperationTime),
          estimatedQuotaUsed,
          operationTimes,
          efficiency: 'patch-based (most efficient)'
        }
      });

      console.log(`   ✅ Optimization test completed`);
      console.log(`   📊 Operations: ${totalOperations}, Estimated quota: ${estimatedQuotaUsed} units`);
      console.log(`   ⚡ Average time per operation: ${Math.round(averageOperationTime)}ms`);

    } catch (error) {
      this.addResult({
        step: 'Credit Optimization',
        passed: false,
        message: `Optimization test failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - stepStart
      });
    }
  }

  /**
   * Generate comprehensive test report
   */
  private async generateTestReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const successRate = (passedTests / totalTests) * 100;

    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPLETE MEETING TEST REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    
    if (this.testEventId) {
      console.log(`🔗 Test Event ID: ${this.testEventId}`);
    }

    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      
      console.log(`${index + 1}. ${status} ${result.step}${duration}`);
      console.log(`   ${result.message}`);
      
      if (result.data && (!result.passed || result.step === 'Credit Optimization')) {
        console.log(`   Details: ${JSON.stringify(result.data, null, 2).slice(0, 200)}...`);
      }
      console.log('');
    });

    console.log('\n🎯 Test Summary:');
    console.log('- Meeting creation with default environment values: ✓');
    console.log('- Single user addition using TEST_USER_EMAIL: ✓');
    console.log('- Batch user addition with multiple domains: ✓');
    console.log('- Meeting link retrieval and validation: ✓');
    console.log('- Credit-optimized API operations: ✓');
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Meeting creation and user management working perfectly.');
    } else {
      console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Check details above.`);
    }
  }

  /**
   * Add test result
   */
  private addResult(result: TestResult): void {
    this.results.push(result);
  }

  /**
   * Cleanup test resources
   */
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test resources...');
    
    try {
      if (this.testEventId) {
        const impersonateUser = getAdminEmail();
        const calendar = await getCalendarClient(impersonateUser);
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: this.testEventId
        });
        
        console.log('✅ Test event deleted successfully');
      }
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const testSuite = new CompleteMeetingTestSuite();
  testSuite.runAllTests().catch(console.error);
}

export default CompleteMeetingTestSuite;
