/**
 * Test script for admin notification emails with different plan types
 * 
 * This script tests the admin notification email functionality with different plan types
 * Run with: npx tsx scripts/test-admin-plan-types.ts
 */
import { sendAdminNotificationEmail } from '../lib/email';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.ADMIN_EMAIL) {
  console.error('ERROR: EMAIL_USER, EMAIL_PASSWORD, and ADMIN_EMAIL environment variables must be set.');
  console.error('Please set the following in your .env file:');
  console.error('EMAIL_USER=your_gmail_address@gmail.com');
  console.error('EMAIL_PASSWORD=your_app_password');
  console.error('ADMIN_EMAIL=admin_email@example.com');
  process.exit(1);
}

// Test user data
const testUser = {
  id: 'test-user-id-' + Date.now(),
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '+91 9876543210',
  source: 'Instagram',
  referenceName: 'Friend Referral'
};

// Array of plan types to test
const planTypes = ['daily', 'monthly', 'unlimited', 'custom-plan'];

// Function to run the test
async function runTest() {
  console.log('🔍 Starting admin notification email test with different plan types...');
  console.log(`📧 Test emails will be sent to admin: ${process.env.ADMIN_EMAIL}`);
  
  for (const planType of planTypes) {
    try {
      // Test data
      const testStartDate = new Date();
      const testEndDate = new Date();
      testEndDate.setDate(testEndDate.getDate() + 30); // 30 days from now
      const testAmount = 1499;
      const testPaymentId = 'pay_' + Date.now();
      
      console.log(`\n📩 Testing admin notification email with plan type: ${planType}...`);
      
      const result = await sendAdminNotificationEmail({
        user: testUser,
        planType: planType,
        startDate: testStartDate,
        endDate: testEndDate,
        amount: testAmount,
        paymentId: testPaymentId
      });
      
      if (result) {
        console.log(`✅ Email with plan type ${planType} sent successfully`);
      } else {
        console.error(`❌ Failed to send email with plan type ${planType}`);
      }
      
      // Wait 2 seconds before sending the next email to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error testing plan type ${planType}:`, error);
    }
  }
  
  console.log('\n🏁 Tests completed');
}

// Run the test
runTest();
