// Test script for subscription validation
import { PrismaClient } from '@prisma/client';
import { canUserSubscribeForDates, canUserSubscribe } from '../lib/subscription';

const prisma = new PrismaClient();

async function testSubscriptionValidation() {
  try {
    console.log('Testing subscription validation...');
    // Create 3 test users
    const users = [];
    for (let i = 0; i < 3; i++) {
      const email = `testuser${i + 1}_${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          firstName: `User${i + 1}`,
          lastName: 'Test',
          email,
          phone: '1234567890',
          source: 'Test',
        }
      });
      users.push(user);
    }
    const [userA, userB, userC] = users;
    console.log(`Created users: ${userA.email}, ${userB.email}, ${userC.email}`);

    // Helper to get date ranges
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today); dayAfterTomorrow.setDate(today.getDate() + 2);
    const nextMonth = new Date(today); nextMonth.setDate(today.getDate() + 30);
    const nextMonthEnd = new Date(nextMonth); nextMonthEnd.setDate(nextMonth.getDate() + 30);

    // 1. A has monthly plan, B tries to join family plan with A (should fail for B overlap)
    const aMonthly = await prisma.subscription.create({
      data: {
        userId: userA.id,
        planType: 'monthly',
        startDate: today,
        endDate: nextMonth,
        orderId: `orderA_${Date.now()}`,
        paymentStatus: 'success',
        status: 'active',
        duration: 30
      }
    });
    let result = await canUserSubscribeForDates(userB.email, today, nextMonth, 'monthlyFamily');
    console.log('\nA has monthly, B tries family plan with A (should pass for B):', result.canSubscribe);
    result = await canUserSubscribeForDates(userA.email, today, nextMonth, 'monthlyFamily');
    console.log('A has monthly, A tries family plan (should fail for A):', result.canSubscribe, result.reason);

    // 2. B has daily plan, A tries family plan with B (should fail for B overlap)
    const bDaily = await prisma.subscription.create({
      data: {
        userId: userB.id,
        planType: 'daily',
        startDate: today,
        endDate: tomorrow,
        orderId: `orderB_${Date.now()}`,
        paymentStatus: 'success',
        status: 'active',
        duration: 1
      }
    });
    result = await canUserSubscribeForDates(userA.email, today, tomorrow, 'monthlyFamily');
    console.log('\nB has daily, A tries family plan with B (should fail for B):', result.canSubscribe);
    result = await canUserSubscribeForDates(userB.email, today, tomorrow, 'monthlyFamily');
    console.log('B has daily, B tries family plan (should fail for B):', result.canSubscribe, result.reason);

    // 3. A and C have no overlap, try family plan (should succeed)
    result = await canUserSubscribeForDates(userA.email, dayAfterTomorrow, nextMonth, 'monthlyFamily');
    const resultC = await canUserSubscribeForDates(userC.email, dayAfterTomorrow, nextMonth, 'monthlyFamily');
    console.log('\nA and C no overlap, family plan (should succeed):', result.canSubscribe && resultC.canSubscribe);

    // 4. C gets daily plan, then tries monthly overlapping (should fail)
    const cDaily = await prisma.subscription.create({
      data: {
        userId: userC.id,
        planType: 'daily',
        startDate: today,
        endDate: tomorrow,
        orderId: `orderC_${Date.now()}`,
        paymentStatus: 'success',
        status: 'active',
        duration: 1
      }
    });
    result = await canUserSubscribeForDates(userC.email, today, nextMonth, 'monthly');
    console.log('\nC has daily, tries monthly overlapping (should fail):', result.canSubscribe, result.reason);

    // 5. All users, non-overlapping periods (should succeed)
    const farFuture = new Date(); farFuture.setDate(today.getDate() + 100);
    const farFutureEnd = new Date(farFuture); farFutureEnd.setDate(farFuture.getDate() + 30);
    for (const user of users) {
      result = await canUserSubscribeForDates(user.email, farFuture, farFutureEnd, 'monthly');
      console.log(`\n${user.email} can subscribe for far future (should succeed):`, result.canSubscribe);
    }

    // Clean up test data
    await prisma.subscription.deleteMany({ where: { userId: { in: users.map(u => u.id) } } });
    for (const user of users) {
      await prisma.user.delete({ where: { id: user.id } });
    }
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
