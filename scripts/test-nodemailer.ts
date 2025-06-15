/**
 * Test script for nodemailer functionality
 */
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

// Test email configuration
const testEmailTo = 'test@example.com'; // Replace with a valid test email
const testSubject = 'Test Email from GoaleteMeet';
const testBody = 'This is a test email from the GoaleteMeet application.';

// Configure nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendTestEmail() {
  try {
    if (!process.env.EMAIL_USER) {
      console.error('EMAIL_USER environment variable is not set');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: testEmailTo,
      subject: testSubject,
      text: testBody
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Run the test
sendTestEmail()
  .then(result => {
    if (result) {
      console.log('Test completed successfully');
      process.exit(0);
    } else {
      console.error('Test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  });
