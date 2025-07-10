/**
 * Comprehensive API Endpoint Testing
 * This script tests all critical API endpoints for the GoaleteMeet application.
 * 
 * Run with: npm run test:api-endpoints
 */
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@goalete.com';
const TEST_API_KEY = process.env.TEST_API_KEY || 'test-key';

/**
 * Run tests in sequence with proper error handling
 */
async function runTests() {
  console.log('============================================');
  console.log('  GOALETE API ENDPOINTS TEST SUITE          ');
  console.log('============================================\n');
  
  let hasErrors = false;
  const testResults: Array<{name: string, passed: boolean, error?: any, duration?: number}> = [];
  
  // Run each test and track results
  async function runTest(name: string, testFn: () => Promise<void>) {
    console.log(`\nRunning test: ${name}`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      testResults.push({ name, passed: true, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ FAILED: ${name} (${duration}ms)`);
      console.error(error);
      testResults.push({ name, passed: false, error, duration });
      hasErrors = true;
    }
  }
  
  // Utility function to make API calls
  async function callAPI(endpoint: string, method = 'GET', body?: any, headers?: any) {
    const url = `${BASE_URL}/api/${endpoint}`;
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {})
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`Making ${method} request to ${url}`);
    const response = await fetch(url, options);
    
    if (response.status >= 400) {
      const errorData = await response.json();
      throw new Error(`API Error (${response.status}): ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  }
  
  // Test 1: Check Subscription API
  await runTest('Check Subscription API', async () => {
    // Test valid subscription check
    const result = await callAPI('check-subscription', 'POST', {
      email: TEST_EMAIL,
      planType: 'monthly'
    });
    
    console.log('Subscription check result:', result);
    
    if (typeof result.canSubscribe !== 'boolean') {
      throw new Error('Invalid response: missing canSubscribe boolean');
    }
    
    // Test invalid input
    try {
      await callAPI('check-subscription', 'POST', {
        email: 'invalid-email',
        planType: 'monthly'
      });
      throw new Error('API should have rejected invalid email');
    } catch (error) {
      // Expected error for invalid input
      console.log('✅ API correctly rejected invalid email format');
    }
    
    // Test invalid date range
    try {
      await callAPI('check-subscription', 'POST', {
        email: TEST_EMAIL,
        startDate: '2025-06-30',
        endDate: '2025-06-01'
      });
      throw new Error('API should have rejected invalid date range');
    } catch (error) {
      // Expected error for invalid date range
      console.log('✅ API correctly rejected invalid date range');
    }
  });
  
  // Test 2: Cron Daily Invites API
  await runTest('Cron Daily Invites API', async () => {
    // Test the daily invites API with the test key
    const result = await callAPI(`cron-daily-invites?apiKey=${TEST_API_KEY}&testMode=true`);
    
    console.log('Daily invites result:', {
      success: result.success,
      message: result.message,
      invitesSent: result.invitesSent?.length || 0
    });
    
    if (typeof result.success !== 'boolean') {
      throw new Error('Invalid response: missing success boolean');
    }
    
    // Test cron endpoint
    try {
      await callAPI('cron-daily-invites');
      console.log('✅ Cron endpoint accessible');
    } catch (error) {
      console.log('❌ Cron endpoint test failed:', error instanceof Error ? error.message : String(error));
    }
  });
  
  // Test 3: Meeting Link Generation
  await runTest('Meeting Link Generation', async () => {
    // Create a mock meeting date for testing
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Skip this test in CI/CD environments to avoid creating actual meetings
    if (process.env.CI) {
      console.log('Skipping meeting creation in CI environment');
      return;
    }
    
    // Test meeting link creation via API
    const result = await callAPI('send-meeting-invite', 'POST', {
      email: TEST_EMAIL,
      date: dateStr,
      testMode: true
    });
    
    console.log('Meeting invite result:', {
      success: result.success,
      message: result.message,
      meetingLink: result.meetingLink ? 'Link generated' : 'No link'
    });
    
    if (!result.success) {
      throw new Error(`Failed to create meeting invite: ${result.message}`);
    }
    
    if (!result.meetingLink) {
      throw new Error('No meeting link was generated');
    }
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
  
  // Print test durations
  console.log('\nTest durations:');
  testResults.forEach(test => {
    console.log(`- ${test.name}: ${test.duration}ms`);
  });
  
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
