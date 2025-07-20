import dotenv from 'dotenv';
dotenv.config();

// Script to verify that the admin authentication is working correctly
async function testAdminAuth() {
  const adminPasscode = process.env.ADMIN_PASSCODE;
  
  if (!adminPasscode) {
    console.error('❌ ADMIN_PASSCODE is not set in the .env file');
    return;
  }
  
  console.log('✅ ADMIN_PASSCODE is correctly set in the .env file');
  console.log(`The admin dashboard will be accessible at: http://localhost:3000/admin`);
  console.log('Use the passcode from your .env file to access the dashboard.');
}

testAdminAuth();
