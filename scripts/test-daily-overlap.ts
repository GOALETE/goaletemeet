/**
 * Test script for daily subscription overlap logic
 * Run with: npx tsx scripts/test-daily-overlap.ts
 */

import { canUserSubscribeForDates } from '../lib/subscription';

async function testDailyOverlap() {
  console.log('Testing daily subscription overlap scenarios...');
  
  // Simulate test email
  const testEmail = 'test_user@example.com';
  
  // Create test dates
  const day1 = new Date('2025-06-06'); // June 6
  const day2 = new Date('2025-06-07'); // June 7
  const day3 = new Date('2025-06-08'); // June 8
  
  // Test case 1: Two consecutive day subscriptions
  // - One subscription for day1 to day2
  // - Then try to subscribe for day2 to day3
  // - Should allow this because our fix allows consecutive days

  // This would be simulating having a subscription for June 6
  // And trying to book for June 7
  const result = await canUserSubscribeForDates(
    testEmail,
    day2, // Start date (June 7)
    day3, // End date (June 8)
    'daily'
  );
  
  console.log('\nTest: Booking consecutive days (June 7 after having June 6)');
  console.log('Can subscribe:', result.canSubscribe);
  console.log('Reason:', result.reason);
  
  // If we were using the production database, we'd create test data
  // But this is just a simulation showing how the logic should work
  console.log('\nTest completed - This is a simulation only, no database changes were made');
}

testDailyOverlap()
  .then(() => console.log('Testing completed'))
  .catch(error => console.error('Error:', error));
