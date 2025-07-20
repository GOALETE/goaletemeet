/**
 * Test daily invite cron job functionality
 * Run with: npm run test:daily-cron
 */
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

async function testDailyCron() {
  console.log('=================================');
  console.log('  DAILY INVITE CRON JOB TEST     ');
  console.log('=================================\n');
  
  try {
    console.log('Testing daily invite cron job API endpoint...');
    
    // Get the base URL from environment or use localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Use the admin passcode from environment for authorization
    const adminPasscode = process.env.ADMIN_PASSCODE;
    
    if (!adminPasscode) {
      console.error('❌ ADMIN_PASSCODE environment variable is not set');
      process.exit(1);
    }
    
    // Call the cron job API endpoint
    const response = await fetch(`${baseUrl}/api/cron-daily-invites?passcode=${adminPasscode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Cron job API call successful');
      console.log(`Message: ${result.message}`);
      
      if (result.invitesSent && Array.isArray(result.invitesSent)) {
        const sentCount = result.invitesSent.filter((invite: any) => invite.status === 'sent').length;
        const failedCount = result.invitesSent.filter((invite: any) => invite.status === 'failed').length;
        
        console.log(`Invites sent: ${sentCount}`);
        console.log(`Invites failed: ${failedCount}`);
        
        if (failedCount > 0) {
          console.log('\nFailed invites:');
          result.invitesSent
            .filter((invite: any) => invite.status === 'failed')
            .forEach((invite: any) => {
              console.log(`- Email: ${invite.email}, Error: ${invite.error}`);
            });
        }
      }
      
      if (result.meetingDetails) {
        console.log('\nMeeting details:');
        console.log(`- Date: ${result.meetingDetails.date}`);
        console.log(`- Platform: ${result.meetingDetails.platform}`);
        console.log(`- Start time: ${new Date(result.meetingDetails.startTime).toLocaleTimeString()}`);
        console.log(`- End time: ${new Date(result.meetingDetails.endTime).toLocaleTimeString()}`);
      }
    } else {
      console.error('❌ Cron job API call failed');
      console.error(`Status: ${response.status}`);
      console.error(`Error: ${result.message || result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Error testing daily invite cron job:', error);
  }
}

// Run the test
testDailyCron().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
});
