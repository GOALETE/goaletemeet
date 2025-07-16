/**
 * Manual test script for the daily cron job
 * This can be used to test the cron job functionality locally
 */

const CRON_DAILY_INVITES_URL = 'http://localhost:3000/api/cron-daily-invites';
const CRON_STATUS_URL = 'http://localhost:3000/api/cron-status';

async function testCronStatus() {
  console.log('🔍 Testing cron status endpoint...');
  
  try {
    const response = await fetch(CRON_STATUS_URL);
    const data = await response.json();
    
    console.log('✅ Cron Status Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error testing cron status:', error);
  }
}

async function testDailyCron() {
  console.log('🧪 Testing daily cron job endpoint...');
  
  try {
    const response = await fetch(CRON_DAILY_INVITES_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Daily Cron Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Daily Cron Error Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing daily cron:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting cron job tests...\n');
  
  await testCronStatus();
  console.log('\n' + '='.repeat(50) + '\n');
  await testDailyCron();
  
  console.log('\n🎉 Tests completed!');
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

export { testCronStatus, testDailyCron, runTests };
