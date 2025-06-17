// Test script for subscription validation
import { PrismaClient } from '@prisma/client';
import { canUserSubscribeForDates, canUserSubscribe } from '../lib/subscription';

const prisma = new PrismaClient();

async function testSubscriptionValidation() {
  try {
    console.log('Testing subscription validation...');
    
    // Create a test user with no subscriptions
    const testEmail = `test_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        phone: '1234567890',
        source: 'Test',
      }
    });
    
    console.log(`Created test user with email: ${testEmail}`);
    
    // Test 1: User with no subscriptions should be able to subscribe
    let result = await canUserSubscribe(testEmail);
    console.log('\nTest 1: User with no subscriptions');
    console.log('Can subscribe:', result.canSubscribe);
    console.log('Reason:', result.reason);
    
    // Create a daily subscription
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dailySub = await prisma.subscription.create({
      data: {
        userId: user.id,
        planType: 'daily',
        startDate: today,
        endDate: tomorrow,
        orderId: `test_order_${Date.now()}`,
        paymentStatus: 'success',
        status: 'active',
        duration: 1
      }
    });
    
    console.log('\nCreated daily subscription for today');
    
    // Test 2: User with daily subscription should not be able to subscribe for the same day
    result = await canUserSubscribeForDates(testEmail, today, tomorrow, 'daily');
    console.log('\nTest 2: User with daily subscription trying to get another daily for same day');
    console.log('Can subscribe:', result.canSubscribe);
    console.log('Reason:', result.reason);
    
    // Test 3: User with daily subscription should not be able to get monthly that overlaps
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    
    result = await canUserSubscribeForDates(testEmail, today, nextMonth, 'monthly');
    console.log('\nTest 3: User with daily subscription trying to get monthly that overlaps');
    console.log('Can subscribe:', result.canSubscribe);
    console.log('Reason:', result.reason);
    
    // Test 4: User should be able to subscribe for non-overlapping period
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(tomorrow.getDate() + 1);
    
    const twoDaysAfter = new Date(dayAfterTomorrow);
    twoDaysAfter.setDate(dayAfterTomorrow.getDate() + 1);
    
    result = await canUserSubscribeForDates(testEmail, dayAfterTomorrow, twoDaysAfter, 'daily');
    console.log('\nTest 4: User subscribing for non-overlapping period');
    console.log('Can subscribe:', result.canSubscribe);
    console.log('Reason:', result.reason);
    
    // Clean up test data
    await prisma.subscription.delete({
      where: { id: dailySub.id }
    });
    
    await prisma.user.delete({
      where: { id: user.id }
    });
    
    console.log('\nTest data cleaned up');
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscriptionValidation()
  .then(() => console.log('Testing completed'))
  .catch(error => console.error('Error:', error));
