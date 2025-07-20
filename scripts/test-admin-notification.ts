/**
 * Test script for admin notification emails
 * 
 * This script tests the admin notification email functionality
 * Run with: npx tsx scripts/test-admin-notification.ts
 */
import { sendAdminNotificationEmail } from '../lib/email';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.ADMIN_EMAIL) {
  console.error('ERROR: EMAIL_USER, EMAIL_PASSWORD, and ADMIN_EMAIL environment variables must be set.');
  console.error('Please update your .env file with proper Gmail SMTP credentials and admin email.');
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

// Test subscription data
const testPlan = 'monthly';
const testStartDate = new Date();
const testEndDate = new Date();
testEndDate.setDate(testEndDate.getDate() + 30); // 30 days from now
const testAmount = 1499;
const testPaymentId = 'pay_' + Date.now();

// Function to run the test
async function runTest() {
  console.log('🔍 Starting admin notification email test...');
  console.log(`📧 Test email will be sent to admin: ${process.env.ADMIN_EMAIL}`);
  
  try {
    // Test admin notification email
    console.log('\n📩 Testing admin notification email...');
    const result = await sendAdminNotificationEmail({
      user: testUser,
      planType: testPlan,
      startDate: testStartDate,
      endDate: testEndDate,
      amount: testAmount,
      paymentId: testPaymentId
    });
    
    if (result) {
      console.log('✅ Admin notification email sent successfully!');
    } else {
      console.error('❌ Failed to send admin notification email.');
    }
    
    console.log('\n🔍 Test summary:');
    console.log(`- Admin notification email: ${result ? '✅ Success' : '❌ Failed'}`);
    
    if (result) {
      console.log('\n🎉 Test passed successfully!');
      console.log(`Please check the admin email (${process.env.ADMIN_EMAIL}) to verify the email was received and formatted correctly.`);
    } else {
      console.error('\n❌ Test failed. Please check the error messages above.');
    }
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
runTest();
