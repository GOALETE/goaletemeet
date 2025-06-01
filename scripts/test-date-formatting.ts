// Test script for date formatting
import { canUserSubscribeForDates } from '../lib/subscription';

async function testDateFormatting() {
  try {
    console.log('Testing date formatting in subscription error messages...');
    
    // Create test dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(tomorrow.getDate() + 1);
    
    // Simulate a booking for day after tomorrow when you have a booking for today-tomorrow
    // This should now succeed with our fix
    const result = await canUserSubscribeForDates(
      'test@example.com',
      dayAfterTomorrow,
      new Date(dayAfterTomorrow.getTime() + 24 * 60 * 60 * 1000),
      'daily'
    );
    
    console.log('Test result:');
    console.log('Can subscribe:', result.canSubscribe);
    console.log('Reason:', result.reason);
    
    // Also test the scenario with an actual overlap (this should still fail)
    const overlapResult = await canUserSubscribeForDates(
      'test@example.com',
      today,
      tomorrow,
      'daily'
    );
    
    console.log('\nOverlap test result:');
    console.log('Can subscribe:', overlapResult.canSubscribe);
    console.log('Reason:', overlapResult.reason);
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

testDateFormatting()
  .then(() => console.log('Testing completed'))
  .catch(error => console.error('Error:', error));
