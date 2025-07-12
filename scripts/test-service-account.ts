/**
 * Test script for Google Calendar service account integration
 * This script validates the service account authentication and Google Calendar API access
 */

import { getCalendarClient, testAuthentication, isAuthenticated } from '../lib/googleAuth';
import { google_create_meet } from '../lib/meetingLink';

class ServiceAccountTestSuite {
  private results: Array<{
    test: string;
    passed: boolean;
    error?: string;
    details?: any;
  }> = [];

  private addResult(test: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ test, passed, error, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${test}`);
    if (error) console.log(`   Error: ${error}`);
    if (details) console.log(`   Details:`, details);
  }

  /**
   * Test 1: Environment Variables Configuration
   */
  async testEnvironmentVariables() {
    console.log('\n🔧 Testing Environment Variables...');
    
    const requiredVars = [
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CALENDAR_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    const allSet = missingVars.length === 0;
    
    this.addResult('Service account environment variables', allSet, 
      missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : undefined);
  }

  /**
   * Test 2: Service Account Configuration Check
   */
  async testServiceAccountConfiguration() {
    console.log('\n🔑 Testing Service Account Configuration...');
    
    try {
      const authenticated = isAuthenticated();
      this.addResult('Service account configuration', authenticated, 
        authenticated ? undefined : 'Service account credentials not properly configured');
        
      if (authenticated) {
        console.log(`   Client Email: ${process.env.GOOGLE_CLIENT_EMAIL}`);
        console.log(`   Calendar ID: ${process.env.GOOGLE_CALENDAR_ID}`);
      }
    } catch (error) {
      this.addResult('Service account configuration', false, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 3: Google Calendar API Authentication Test
   */
  async testCalendarAuthentication() {
    console.log('\n📅 Testing Google Calendar API Authentication...');
    
    try {
      const testPassed = await testAuthentication();
      this.addResult('Google Calendar API authentication', testPassed, 
        testPassed ? undefined : 'Failed to authenticate with Google Calendar API');
    } catch (error) {
      this.addResult('Google Calendar API authentication', false, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 4: Calendar Client Creation
   */
  async testCalendarClient() {
    console.log('\n📊 Testing Calendar Client Creation...');
    
    try {
      const calendar = await getCalendarClient();
      this.addResult('Calendar client creation', true, undefined, {
        message: 'Calendar client created successfully'
      });
    } catch (error) {
      this.addResult('Calendar client creation', false, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 5: Meeting Creation with Service Account
   */
  async testMeetingCreation() {
    console.log('\n🎯 Testing Meeting Creation...');
    
    try {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1); // Tomorrow
      const dateStr = testDate.toISOString().split('T')[0];
      
      const result = await google_create_meet({
        date: dateStr,
        startTime: '21:00',
        duration: 60,
        meetingTitle: 'Service Account Test Meeting',
        meetingDesc: 'Test meeting created during service account validation'
      });

      if (result.join_url && result.id) {
        this.addResult('Meeting creation with service account', true, undefined, {
          meetingId: result.id,
          joinUrl: result.join_url,
          date: dateStr
        });
      } else {
        this.addResult('Meeting creation with service account', false, 'No meeting URL or ID returned');
      }
    } catch (error) {
      this.addResult('Meeting creation with service account', false, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 6: Check Calendar Access Permissions
   */
  async testCalendarPermissions() {
    console.log('\n🔒 Testing Calendar Permissions...');
    
    try {
      const calendar = await getCalendarClient();
      
      // Test calendar read access
      const calendarInfo = await calendar.calendars.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary'
      });
      
      this.addResult('Calendar read permissions', true, undefined, {
        calendarName: calendarInfo.data.summary,
        timezone: calendarInfo.data.timeZone
      });
    } catch (error) {
      this.addResult('Calendar read permissions', false, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate summary report
   */
  generateReport() {
    console.log('\n📋 Test Results Summary');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   - ${result.test}: ${result.error}`);
      });
    }

    console.log('\n✅ Service Account Configuration Status:');
    const criticalTests = [
      'Service account environment variables',
      'Service account configuration', 
      'Google Calendar API authentication'
    ];
    
    const criticalPassed = criticalTests.every(test => 
      this.results.find(r => r.test === test)?.passed
    );
    
    if (criticalPassed) {
      console.log('🎉 Service account is properly configured and ready to use!');
    } else {
      console.log('⚠️ Service account configuration needs attention.');
    }
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🧪 Google Calendar Service Account Integration Test');
    console.log('Testing service account authentication instead of OAuth2...\n');
    
    await this.testEnvironmentVariables();
    await this.testServiceAccountConfiguration();
    await this.testCalendarAuthentication();
    await this.testCalendarClient();
    await this.testMeetingCreation();
    await this.testCalendarPermissions();
    
    this.generateReport();
  }
}

// Run the test suite
const testSuite = new ServiceAccountTestSuite();
testSuite.runAll().catch(console.error);
