#!/usr/bin/env ts-node

/**
 * Test script for Domain-Wide Delegation setup
 * 
 * This script tests:
 * 1. Direct service account authentication
 * 2. Domain-Wide Delegation (user impersonation)
 * 3. Meeting creation with attendee invitations
 * 
 * Prerequisites:
 * 1. Service account created in Google Cloud Console
 * 2. Domain-Wide Delegation enabled for the service account
 * 3. Admin consent granted in Google Admin Console
 * 4. OAuth scopes configured: https://www.googleapis.com/auth/calendar
 */

import dotenv from 'dotenv';
import { 
  testDomainWideDelegation, 
  testAuthentication, 
  getDefaultImpersonationUser,
  getCalendarClient,
  getAdminEmail
} from '../lib/googleAuth';
import { google_create_meet, google_add_user_to_meeting } from '../lib/meetingLink';

// Load environment variables
dotenv.config();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  error?: string;
}

class DomainWideDelegationTester {
  private results: TestResult[] = [];

  private log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const timestamp = new Date().toISOString();
    const icons = { info: '📝', success: '✅', error: '❌', warn: '⚠️' };
    console.log(`${icons[type]} [${timestamp}] ${message}`);
  }

  private addResult(name: string, status: 'PASS' | 'FAIL' | 'SKIP', details: string, error?: string) {
    this.results.push({ name, status, details, error });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    this.log(`${icon} ${name}: ${details}`, status === 'PASS' ? 'success' : status === 'FAIL' ? 'error' : 'warn');
  }

  async testEnvironmentConfiguration(): Promise<void> {
    this.log('🔍 Testing environment configuration...', 'info');

    // Test 1: Basic service account credentials
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    if (!clientEmail || !privateKey) {
      this.addResult(
        'Environment Configuration', 
        'FAIL', 
        'Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY',
        'Service account credentials not properly configured'
      );
      return;
    }

    this.addResult(
      'Service Account Credentials', 
      'PASS', 
      `Client email: ${clientEmail.substring(0, 20)}...`
    );

    // Test 2: Impersonation user configuration
    const impersonateUser = getDefaultImpersonationUser();
    if (!impersonateUser) {
      this.addResult(
        'Impersonation User Config', 
        'FAIL', 
        'No impersonation user found in environment variables',
        'Set ADMIN_EMAIL environment variable'
      );
    } else {
      this.addResult(
        'Impersonation User Config', 
        'PASS', 
        `Impersonation user: ${impersonateUser}`
      );
    }

    // Test 3: Test user configuration
    const testUserEmail = process.env.TEST_USER_EMAIL;
    const testUserName = process.env.TEST_USER_NAME;
    
    if (!testUserEmail) {
      this.addResult(
        'Test User Config', 
        'FAIL', 
        'TEST_USER_EMAIL not configured',
        'Set TEST_USER_EMAIL for testing attendee invitations'
      );
    } else {
      this.addResult(
        'Test User Config', 
        'PASS', 
        `Test user: ${testUserName || 'No name'} <${testUserEmail}>`
      );
    }
  }

  async testAuthentication(): Promise<void> {
    this.log('🔐 Testing authentication methods...', 'info');

    try {
      // Test Domain-Wide Delegation
      const delegationResults = await testDomainWideDelegation();

      if (delegationResults.directAccess) {
        this.addResult(
          'Direct Service Account Access', 
          'PASS', 
          'Service account can access Google Calendar API directly'
        );
      } else {
        this.addResult(
          'Direct Service Account Access', 
          'FAIL', 
          'Service account cannot access Google Calendar API',
          delegationResults.error
        );
      }

      if (delegationResults.impersonationUser) {
        if (delegationResults.userImpersonation) {
          this.addResult(
            'Domain-Wide Delegation', 
            'PASS', 
            `Successfully impersonated user: ${delegationResults.impersonationUser}`
          );
        } else {
          this.addResult(
            'Domain-Wide Delegation', 
            'FAIL', 
            `Failed to impersonate user: ${delegationResults.impersonationUser}`,
            delegationResults.error || 'User impersonation failed - check Domain-Wide Delegation setup'
          );
        }
      } else {
        this.addResult(
          'Domain-Wide Delegation', 
          'SKIP', 
          'No impersonation user configured for testing'
        );
      }
    } catch (error) {
      this.addResult(
        'Authentication Tests', 
        'FAIL', 
        'Authentication testing failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async testMeetingCreation(): Promise<string | null> {
    this.log('📅 Testing meeting creation with Domain-Wide Delegation...', 'info');

    try {
      // Get tomorrow's date for testing
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const testDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
      const testTime = '15:00'; // 3 PM
      const testDuration = 30; // 30 minutes

      this.log(`Creating test meeting for ${testDate} at ${testTime} (${testDuration} minutes)`, 'info');

      const meetingResult = await google_create_meet({
        date: testDate,
        startTime: testTime,
        duration: testDuration,
        meetingTitle: 'Domain-Wide Delegation Test Meeting',
        meetingDesc: 'This is a test meeting created to verify Domain-Wide Delegation setup.'
      });

      if (meetingResult.join_url && meetingResult.id) {
        this.addResult(
          'Meeting Creation', 
          'PASS', 
          `Meeting created successfully. Event ID: ${meetingResult.id}`
        );
        this.log(`🔗 Meeting link: ${meetingResult.join_url}`, 'success');
        return meetingResult.id;
      } else {
        this.addResult(
          'Meeting Creation', 
          'FAIL', 
          'Meeting creation returned incomplete data',
          'Missing join_url or event ID'
        );
        return null;
      }
    } catch (error) {
      this.addResult(
        'Meeting Creation', 
        'FAIL', 
        'Failed to create test meeting',
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  async testAttendeeInvitation(eventId: string): Promise<void> {
    this.log('👥 Testing attendee invitation with Domain-Wide Delegation...', 'info');

    const testUserEmail = process.env.TEST_USER_EMAIL;
    const testUserName = process.env.TEST_USER_NAME;

    if (!testUserEmail) {
      this.addResult(
        'Attendee Invitation', 
        'SKIP', 
        'No test user email configured'
      );
      return;
    }

    try {
      await google_add_user_to_meeting(eventId, testUserEmail, testUserName);
      
      this.addResult(
        'Attendee Invitation', 
        'PASS', 
        `Successfully added ${testUserName || testUserEmail} to meeting`
      );
      
      this.log('🎉 Domain-Wide Delegation is working correctly!', 'success');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Domain-Wide Delegation')) {
        this.addResult(
          'Attendee Invitation', 
          'FAIL', 
          'Domain-Wide Delegation not properly configured',
          'Service accounts cannot invite attendees without Domain-Wide Delegation. Please configure Domain-Wide Delegation in Google Admin Console.'
        );
      } else {
        this.addResult(
          'Attendee Invitation', 
          'FAIL', 
          'Failed to add attendee to meeting',
          errorMessage
        );
      }
    }
  }

  async testCalendarAccess(): Promise<void> {
    this.log('📋 Testing calendar access with different authentication methods...', 'info');

    try {
      // Test 1: Direct service account access
      const directCalendar = await getCalendarClient();
      const directCalendarInfo = await directCalendar.calendars.get({ calendarId: 'primary' });
      
      this.addResult(
        'Direct Calendar Access', 
        'PASS', 
        `Calendar summary: ${directCalendarInfo.data.summary || 'Primary Calendar'}`
      );
    } catch (error) {
      this.addResult(
        'Direct Calendar Access', 
        'FAIL', 
        'Failed to access calendar directly',
        error instanceof Error ? error.message : String(error)
      );
    }

    try {
      // Test 2: Impersonated user access
      const impersonateUser = getDefaultImpersonationUser();
      if (impersonateUser) {
        const impersonatedCalendar = await getCalendarClient(impersonateUser);
        const impersonatedCalendarInfo = await impersonatedCalendar.calendars.get({ calendarId: 'primary' });
        
        this.addResult(
          'Impersonated Calendar Access', 
          'PASS', 
          `Impersonated user calendar: ${impersonatedCalendarInfo.data.summary || 'Primary Calendar'}`
        );
      } else {
        this.addResult(
          'Impersonated Calendar Access', 
          'SKIP', 
          'No impersonation user configured'
        );
      }
    } catch (error) {
      this.addResult(
        'Impersonated Calendar Access', 
        'FAIL', 
        'Failed to access calendar with user impersonation',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  printSummary(): void {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('🎯 DOMAIN-WIDE DELEGATION TEST SUMMARY', 'info');
    this.log('='.repeat(80), 'info');

    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const skipCount = this.results.filter(r => r.status === 'SKIP').length;

    this.log(`📊 Results: ${passCount} PASS, ${failCount} FAIL, ${skipCount} SKIP`, 'info');
    
    if (failCount === 0) {
      this.log('🎉 All tests passed! Domain-Wide Delegation is properly configured.', 'success');
    } else {
      this.log('⚠️  Some tests failed. Please review the configuration.', 'warn');
    }

    this.log('\n📋 Detailed Results:', 'info');
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      this.log(`  ${icon} ${result.name}: ${result.details}`, 'info');
      if (result.error) {
        this.log(`     💡 ${result.error}`, 'warn');
      }
    });

    if (failCount > 0) {
      this.log('\n🔧 Setup Instructions:', 'info');
      this.log('1. Go to Google Admin Console (admin.google.com)', 'info');
      this.log('2. Navigate to Security → API Controls → Manage Domain-Wide Delegation', 'info');
      this.log('3. Add your service account Client ID with scope: https://www.googleapis.com/auth/calendar', 'info');
      this.log('4. Set ADMIN_EMAIL environment variable to a valid user email', 'info');
      this.log('5. Re-run this test script', 'info');
    }
  }

  async runAllTests(): Promise<void> {
    this.log('🚀 Starting Domain-Wide Delegation Testing Suite', 'info');
    this.log('='.repeat(80), 'info');

    await this.testEnvironmentConfiguration();
    await this.testAuthentication();
    await this.testCalendarAccess();
    
    const eventId = await this.testMeetingCreation();
    if (eventId) {
      await this.testAttendeeInvitation(eventId);
    }

    this.printSummary();
  }
}

// Main execution
async function main() {
  const tester = new DomainWideDelegationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export default DomainWideDelegationTester;
