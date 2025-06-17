// Test runner script for meetings integration
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Required environment variables for Google Meet integration
const requiredGoogleVars = [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CALENDAR_ID'
];

// Required environment variables for Zoom integration
const requiredZoomVars = [
  'ZOOM_JWT_TOKEN',
  'ZOOM_USER_ID'
];

// Other required environment variables
const requiredGeneralVars = [
  'DEFAULT_MEETING_PLATFORM',
  'DEFAULT_MEETING_TIME',
  'DEFAULT_MEETING_DURATION',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'ADMIN_PASSCODE'
];

function checkEnvVars() {
  console.log('Checking environment variables...');
  
  const missingVars = [];
  const platform = process.env.DEFAULT_MEETING_PLATFORM || 'google-meet';
  
  // Check platform-specific variables
  const platformVars = platform === 'google-meet' ? requiredGoogleVars : requiredZoomVars;
  console.log(`Checking ${platform} integration variables...`);
  
  for (const varName of platformVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  // Check general variables
  console.log('Checking general meeting variables...');
  for (const varName of requiredGeneralVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease set these variables in your .env file before running tests.');
    console.error('You can use .env.example as a template.');
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
}

function runTest(scriptName: string, description: string): boolean {
  console.log(`\n====== Running: ${description} ======\n`);
  try {
    execSync(`npm run ${scriptName}`, { stdio: 'inherit' });
    console.log(`\n✅ ${description} completed successfully\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} failed\n`);
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function runTests() {
  console.log('======================================');
  console.log('  GOALETE MEETING INTEGRATION TESTS  ');
  console.log('======================================\n');
  
  // Check if the environment is properly configured
  if (!checkEnvVars()) {
    process.exit(1);
  }
  
  // Run tests in sequence
  const tests = [
    { script: 'test:meeting-env', description: 'Meeting Environment Variables Test' },
    { script: 'test:meeting-api', description: 'Meeting API Integration Test' },
    { script: 'test:admin-meetings', description: 'Admin Meetings API Test' },
    { script: 'test:cron-invites', description: 'Daily Cron Job Test' }
  ];
  
  let failedTests = 0;
  
  for (const test of tests) {
    const success = runTest(test.script, test.description);
    if (!success) failedTests++;
  }
  
  console.log('\n======================================');
  console.log('           TEST SUMMARY              ');
  console.log('======================================');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${tests.length - failedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log('======================================\n');
  
  if (failedTests > 0) {
    console.log('❌ Some tests failed. Please check the logs above for details.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed successfully!');
  }
}

runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
