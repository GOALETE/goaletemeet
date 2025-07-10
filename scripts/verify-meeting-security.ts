/**
 * Google Meet Security Verification Script
 * 
 * This script tests and verifies the security implementation of the Google Meet system.
 * It checks various security aspects including access controls, extended properties,
 * and attendee management.
 * 
 * Usage: npm run test:security or node scripts/verify-meeting-security.ts
 */

import { google } from 'googleapis';
import { 
  google_create_meet, 
  google_add_users_to_meeting, 
  enhanceMeetingSecurity,
  getMeetingSecurityStatus,
  GOOGLE_MEET_SECURITY_SETTINGS 
} from '../lib/meetingLink';
import prisma from '../lib/prisma';

// Test configuration with cross-domain emails
const TEST_CONFIG = {
  date: '2024-01-20',
  startTime: '15:00',
  duration: 60,
  testEmails: [
    'test1@gmail.com',        // External domain: Gmail
    'test2@yahoo.com',        // External domain: Yahoo
    'test3@outlook.com',      // External domain: Outlook
    'test4@company.com'       // External domain: Corporate
  ]
};

interface SecurityTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

class MeetingSecurityVerifier {
  private results: SecurityTestResult[] = [];
  private testEventId: string | null = null;

  /**
   * Run all security verification tests
   */
  async runAllTests(): Promise<void> {
    console.log('🔐 Starting Google Meet Security Verification Tests...\n');

    try {
      // Test 1: Basic meeting creation with security settings
      await this.testSecureMeetingCreation();

      // Test 2: Extended properties verification
      await this.testExtendedProperties();

      // Test 3: Attendee management security
      await this.testAttendeeManagement();

      // Test 4: Security enhancement function
      await this.testSecurityEnhancement();

      // Test 5: Security status monitoring
      await this.testSecurityStatusMonitoring();

      // Test 6: Access control verification
      await this.testAccessControls();

      // Test 7: Cross-domain validation and support
      await this.testCrossDomainSupport();

      // Test 8: Integration with database
      await this.testDatabaseIntegration();

    } catch (error) {
      console.error('❌ Test suite failed with error:', error);
    } finally {
      // Cleanup test event
      await this.cleanup();
      
      // Print results
      this.printResults();
    }
  }

  /**
   * Test secure meeting creation
   */
  private async testSecureMeetingCreation(): Promise<void> {
    try {
      console.log('🧪 Testing secure meeting creation...');
      
      const result = await google_create_meet({
        date: TEST_CONFIG.date,
        startTime: TEST_CONFIG.startTime,
        duration: TEST_CONFIG.duration,
        meetingTitle: 'Security Test Meeting',
        meetingDesc: 'Testing security implementation'
      });

      this.testEventId = result.id;

      this.addResult({
        testName: 'Secure Meeting Creation',
        passed: !!result.join_url && !!result.id,
        message: result.join_url ? 'Meeting created successfully with secure settings' : 'Failed to create meeting',
        details: {
          eventId: result.id,
          meetingUrl: result.join_url
        }
      });

    } catch (error) {
      this.addResult({
        testName: 'Secure Meeting Creation',
        passed: false,
        message: `Meeting creation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Test extended properties implementation
   */
  private async testExtendedProperties(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        testName: 'Extended Properties',
        passed: false,
        message: 'No test event available for extended properties test'
      });
      return;
    }

    try {
      console.log('🧪 Testing extended properties...');
      
      const securityStatus = await getMeetingSecurityStatus(this.testEventId);

      const hasRequiredProperties = securityStatus.hasExtendedProperties;
      
      this.addResult({
        testName: 'Extended Properties',
        passed: hasRequiredProperties,
        message: hasRequiredProperties 
          ? 'Extended properties correctly implemented' 
          : 'Extended properties missing or incomplete',
        details: securityStatus
      });

    } catch (error) {
      this.addResult({
        testName: 'Extended Properties',
        passed: false,
        message: `Extended properties test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Test attendee management security
   */
  private async testAttendeeManagement(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        testName: 'Attendee Management',
        passed: false,
        message: 'No test event available for attendee management test'
      });
      return;
    }

    try {
      console.log('🧪 Testing attendee management security...');
      
      // Add test users
      const testUsers = TEST_CONFIG.testEmails.map(email => ({
        email,
        name: `Test User ${email.split('@')[0]}`
      }));

      await google_add_users_to_meeting(this.testEventId, testUsers);

      // Verify attendees were added
      const securityStatus = await getMeetingSecurityStatus(this.testEventId);
      const addedAttendees = securityStatus.attendees.filter(
        attendee => TEST_CONFIG.testEmails.includes(attendee.email)
      );

      const allUsersAdded = addedAttendees.length === TEST_CONFIG.testEmails.length;
      const allAccepted = addedAttendees.every(attendee => attendee.responseStatus === 'accepted');

      this.addResult({
        testName: 'Attendee Management',
        passed: allUsersAdded && allAccepted,
        message: allUsersAdded && allAccepted
          ? 'Attendees added successfully with correct security settings'
          : `Attendee management issues: ${addedAttendees.length}/${TEST_CONFIG.testEmails.length} added, accepted: ${allAccepted}`,
        details: {
          expectedCount: TEST_CONFIG.testEmails.length,
          actualCount: addedAttendees.length,
          allAccepted,
          attendees: addedAttendees
        }
      });

    } catch (error) {
      this.addResult({
        testName: 'Attendee Management',
        passed: false,
        message: `Attendee management test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Test security enhancement function
   */
  private async testSecurityEnhancement(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        testName: 'Security Enhancement',
        passed: false,
        message: 'No test event available for security enhancement test'
      });
      return;
    }

    try {
      console.log('🧪 Testing security enhancement function...');
      
      await enhanceMeetingSecurity(this.testEventId, {
        extendedProperties: {
          private: {
            'testEnhancement': 'true',
            'enhancedAt': new Date().toISOString()
          }
        }
      } as any); // Type assertion for test properties

      // Verify enhancement was applied
      const securityStatus = await getMeetingSecurityStatus(this.testEventId);

      this.addResult({
        testName: 'Security Enhancement',
        passed: securityStatus.isSecure,
        message: securityStatus.isSecure 
          ? 'Security enhancement applied successfully' 
          : 'Security enhancement failed to apply all settings',
        details: securityStatus
      });

    } catch (error) {
      this.addResult({
        testName: 'Security Enhancement',
        passed: false,
        message: `Security enhancement test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Test security status monitoring
   */
  private async testSecurityStatusMonitoring(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        testName: 'Security Status Monitoring',
        passed: false,
        message: 'No test event available for security status monitoring test'
      });
      return;
    }

    try {
      console.log('🧪 Testing security status monitoring...');
      
      const securityStatus = await getMeetingSecurityStatus(this.testEventId);

      const hasAllRequiredFields = !!(
        securityStatus.isSecure !== undefined &&
        securityStatus.securityLevel &&
        securityStatus.attendeeCount !== undefined &&
        securityStatus.visibility &&
        securityStatus.guestPermissions &&
        securityStatus.attendees
      );

      this.addResult({
        testName: 'Security Status Monitoring',
        passed: hasAllRequiredFields,
        message: hasAllRequiredFields 
          ? 'Security status monitoring working correctly' 
          : 'Security status monitoring missing required fields',
        details: securityStatus
      });

    } catch (error) {
      this.addResult({
        testName: 'Security Status Monitoring',
        passed: false,
        message: `Security status monitoring test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Test access controls
   */
  private async testAccessControls(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        testName: 'Access Controls',
        passed: false,
        message: 'No test event available for access controls test'
      });
      return;
    }

    try {
      console.log('🧪 Testing access controls...');
      
      const securityStatus = await getMeetingSecurityStatus(this.testEventId);

      const correctVisibility = securityStatus.visibility === 'private';
      const correctGuestPermissions = (
        !securityStatus.guestPermissions.canInviteOthers &&
        !securityStatus.guestPermissions.canModify &&
        securityStatus.guestPermissions.canSeeOtherGuests
      );

      const accessControlsCorrect = correctVisibility && correctGuestPermissions;

      this.addResult({
        testName: 'Access Controls',
        passed: accessControlsCorrect,
        message: accessControlsCorrect 
          ? 'Access controls configured correctly' 
          : 'Access controls have incorrect settings',
        details: {
          visibility: securityStatus.visibility,
          guestPermissions: securityStatus.guestPermissions,
          expectedVisibility: 'private',
          expectedGuestPermissions: {
            canInviteOthers: false,
            canModify: false,
            canSeeOtherGuests: true
          }
        }
      });

    } catch (error) {
      this.addResult({
        testName: 'Access Controls',
        passed: false,
        message: `Access controls test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Test cross-domain support
   */
  private async testCrossDomainSupport(): Promise<void> {
    if (!this.testEventId) {
      this.addResult({
        testName: 'Cross-Domain Support',
        passed: false,
        message: 'No test event available for cross-domain test'
      });
      return;
    }

    try {
      console.log('🧪 Testing cross-domain attendee support...');
      
      // Import the cross-domain function
      const { validateCrossDomainEmails, google_add_users_to_meeting_cross_domain } = 
        await import('../lib/meetingLink');

      // Test email validation across domains
      const emailValidation = validateCrossDomainEmails(TEST_CONFIG.testEmails);
      
      const allEmailsValid = emailValidation.validEmails.length === TEST_CONFIG.testEmails.length;
      const hasExternalDomains = emailValidation.hasExternalDomains;
      const multipleDomains = emailValidation.totalDomains > 1;

      // Test cross-domain user addition
      const testUsers = TEST_CONFIG.testEmails.map(email => ({
        email,
        name: `Test User ${email.split('@')[0]}`
      }));

      const crossDomainResult = await google_add_users_to_meeting_cross_domain(
        this.testEventId, 
        testUsers
      );

      const allUsersAdded = crossDomainResult.addedUsers.length === TEST_CONFIG.testEmails.length;
      const noSkippedUsers = crossDomainResult.skippedUsers.length === 0;

      this.addResult({
        testName: 'Cross-Domain Support',
        passed: allEmailsValid && hasExternalDomains && multipleDomains && allUsersAdded && noSkippedUsers,
        message: (allEmailsValid && hasExternalDomains && multipleDomains && allUsersAdded && noSkippedUsers)
          ? 'Cross-domain attendee support working correctly'
          : `Cross-domain issues: valid emails: ${allEmailsValid}, external domains: ${hasExternalDomains}, multiple domains: ${multipleDomains}, all added: ${allUsersAdded}`,
        details: {
          emailValidation,
          crossDomainResult,
          expectedEmails: TEST_CONFIG.testEmails.length,
          addedUsers: crossDomainResult.addedUsers.length,
          skippedUsers: crossDomainResult.skippedUsers.length,
          domainAnalysis: crossDomainResult.domainAnalysis
        }
      });

    } catch (error) {
      this.addResult({
        testName: 'Cross-Domain Support',
        passed: false,
        message: `Cross-domain support test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Test database integration
   */
  private async testDatabaseIntegration(): Promise<void> {
    try {
      console.log('🧪 Testing database integration...');
      
      // Check if meeting was stored in database
      const dbMeetings = await prisma.meeting.findMany({
        where: {
          meetingDate: new Date(TEST_CONFIG.date),
          meetingTitle: 'Security Test Meeting'
        },
        include: { users: true }
      });

      const hasDatabaseRecord = dbMeetings.length > 0;
      const hasCorrectEventId = hasDatabaseRecord && 
        dbMeetings.some(meeting => meeting.googleEventId === this.testEventId);

      this.addResult({
        testName: 'Database Integration',
        passed: hasDatabaseRecord && hasCorrectEventId,
        message: hasDatabaseRecord && hasCorrectEventId
          ? 'Database integration working correctly'
          : `Database integration issues: record exists: ${hasDatabaseRecord}, correct event ID: ${hasCorrectEventId}`,
        details: {
          foundRecords: dbMeetings.length,
          hasCorrectEventId,
          meetings: dbMeetings.map(m => ({
            id: m.id,
            googleEventId: m.googleEventId,
            platform: m.platform
          }))
        }
      });

    } catch (error) {
      this.addResult({
        testName: 'Database Integration',
        passed: false,
        message: `Database integration test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Cleanup test resources
   */
  private async cleanup(): Promise<void> {
    if (!this.testEventId) return;

    try {
      console.log('🧹 Cleaning up test resources...');
      
      // Delete from Google Calendar
      const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
      const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

      if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
        const jwtClient = new google.auth.JWT({
          email: GOOGLE_CLIENT_EMAIL,
          key: GOOGLE_PRIVATE_KEY,
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        
        await jwtClient.authorize();
        const calendar = google.calendar({ version: 'v3', auth: jwtClient });

        await calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: this.testEventId
        });
      }

      // Delete from database
      await prisma.meeting.deleteMany({
        where: {
          googleEventId: this.testEventId
        }
      });

      console.log('✅ Cleanup completed successfully');

    } catch (error) {
      console.warn('⚠️ Cleanup failed (this may be normal if resources were already deleted):', error);
    }
  }

  /**
   * Add a test result
   */
  private addResult(result: SecurityTestResult): void {
    this.results.push(result);
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${result.message}`);
    if (result.details && Object.keys(result.details).length > 0) {
      console.log('   Details:', JSON.stringify(result.details, null, 2));
    }
    console.log('');
  }

  /**
   * Print final test results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 GOOGLE MEET SECURITY VERIFICATION RESULTS');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    console.log(`\n📊 Overall Results: ${passed}/${total} tests passed (${passRate}%)\n`);

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${result.testName}`);
      console.log(`   ${result.message}`);
    });

    if (passed === total) {
      console.log('\n🎉 All security tests passed! Your Google Meet implementation is secure.');
    } else {
      console.log('\n⚠️  Some security tests failed. Please review the failing tests and fix the issues.');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  const verifier = new MeetingSecurityVerifier();
  verifier.runAllTests().catch(console.error);
}

export default MeetingSecurityVerifier;
