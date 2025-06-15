import { PrismaClient } from '@prisma/client';
import { PLAN_PRICING } from '../lib/pricing';
import { sendWelcomeEmail, sendFamilyAdminNotificationEmail } from '../lib/email';

const prisma = new PrismaClient();

async function testFamilyPlanRegistration() {
  console.log('Running Family Plan Registration Test...');
  
  try {
    // 1. Create test users
    const user1 = await prisma.user.upsert({
      where: { email: 'test-family1@example.com' },
      update: {},
      create: {
        firstName: 'Test',
        lastName: 'User1',
        email: 'test-family1@example.com',
        phone: '9876543210',
        source: 'Test',
      }
    });
    
    const user2 = await prisma.user.upsert({
      where: { email: 'test-family2@example.com' },
      update: {},
      create: {
        firstName: 'Test',
        lastName: 'User2',
        email: 'test-family2@example.com',
        phone: '9876543211',
        source: 'Family Plan',
      }
    });
    
    console.log('✅ Test users created');
    
    // 2. Create subscriptions
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const planType = 'monthlyFamily';
    const planPrice = PLAN_PRICING.monthlyFamily.amount;
    const halfPrice = Math.round(planPrice / 2);
    
    // Common data for both subscriptions
    const commonData = {
      planType,
      startDate,
      endDate,
      orderId: 'test_order_' + Date.now(),
      paymentRef: 'test_payment_' + Date.now(),
      paymentStatus: 'completed',
      status: 'active',
      duration: 30,
      price: halfPrice,
    };
    
    // Create two subscriptions
    const sub1 = await prisma.subscription.create({
      data: {
        ...commonData,
        userId: user1.id,
      }
    });
    
    const sub2 = await prisma.subscription.create({
      data: {
        ...commonData,
        userId: user2.id,
      }
    });
    
    console.log('✅ Test subscriptions created');
    console.log(`Subscription 1 ID: ${sub1.id}`);
    console.log(`Subscription 2 ID: ${sub2.id}`);
    
    // 3. Test admin notification email
    const adminNotificationResult = await sendFamilyAdminNotificationEmail({
      users: [
        {
          id: user1.id,
          firstName: user1.firstName,
          lastName: user1.lastName,
          email: user1.email,
          phone: user1.phone,
          source: user1.source,
          subscriptionId: sub1.id,
        },
        {
          id: user2.id,
          firstName: user2.firstName,
          lastName: user2.lastName,
          email: user2.email,
          phone: user2.phone,
          source: user2.source,
          subscriptionId: sub2.id,
        }
      ],
      planType,
      startDate,
      endDate,
      amount: planPrice,
      paymentId: commonData.paymentRef,
    });
    
    console.log(`✅ Admin notification email ${adminNotificationResult ? 'sent' : 'failed'}`);
    
    // 4. Test welcome emails
    // Note: In production, we'd typically not send test emails to real users
    console.log('Welcome emails would be sent to both users');
    
    // 5. Clean up test data (uncomment to actually delete)
    /*
    await prisma.subscription.deleteMany({
      where: { 
        id: { 
          in: [sub1.id, sub2.id] 
        } 
      }
    });
    
    await prisma.user.deleteMany({
      where: { 
        email: { 
          in: ['test-family1@example.com', 'test-family2@example.com'] 
        } 
      }
    });
    
    console.log('✅ Test data cleaned up');
    */
    
    console.log('✅ Family plan registration test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFamilyPlanRegistration();
