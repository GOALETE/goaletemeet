// check-env.js
// A utility script to check for required environment variables

// Load environment variables from .env file
require('dotenv').config();

console.log('Checking environment variables...');
const requiredEnvVars = [
  { name: 'DATABASE_URL', description: 'PostgreSQL database connection URL' },
  { name: 'NEXT_PUBLIC_RAZORPAY_KEY_ID', description: 'Razorpay Key ID for payment processing' },
  { name: 'RAZORPAY_KEY_SECRET', description: 'Razorpay Secret Key for payment processing' },
  { name: 'ADMIN_PASSCODE', description: 'Admin panel access code' },
  { name: 'ADMIN_EMAIL', description: 'Admin email for authentication and notifications' },
  { name: 'EMAIL_PASSWORD', description: 'SMTP email password' },
  { name: 'NEXT_PUBLIC_BASE_URL', description: 'Base URL for the application', optional: true },
  // Google Calendar Service Account (required)
  { name: 'GOOGLE_CLIENT_EMAIL', description: 'Google service account email', optional: false },
  { name: 'GOOGLE_PRIVATE_KEY', description: 'Google service account private key', optional: false },
  { name: 'GOOGLE_CALENDAR_ID', description: 'Google calendar ID (usually "primary")', optional: true },
  // Meeting configuration
  { name: 'DEFAULT_MEETING_PLATFORM', description: 'Default meeting platform (google-meet, zoom)', optional: true },
  { name: 'DEFAULT_MEETING_TIME', description: 'Default meeting time (HH:MM format)', optional: true },
  { name: 'DEFAULT_MEETING_DURATION', description: 'Default meeting duration in minutes', optional: true },
  // Zoom integration
  { name: 'ZOOM_CLIENT_ID', description: 'Zoom client ID', optional: true },
  { name: 'ZOOM_CLIENT_SECRET', description: 'Zoom client secret', optional: true },
  { name: 'ZOOM_ACCOUNT_ID', description: 'Zoom account ID', optional: true },
  // Notification control
  { name: 'DISABLE_ORGANIZER_NOTIFICATIONS', description: 'Disable Google Calendar organizer notifications (true/false)', optional: true },
];

let missingVars = 0;
let optionalMissingVars = 0;

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar.name]) {
    if (envVar.optional) {
      console.log(`⚠️  Optional environment variable missing: ${envVar.name} - ${envVar.description}`);
      optionalMissingVars++;
    } else {
      console.error(`❌ Required environment variable missing: ${envVar.name} - ${envVar.description}`);
      missingVars++;
    }
  } else {
    console.log(`✅ Found ${envVar.name}`);
  }
});

// Check for JWT service account configuration (preferred method)
const hasJWT = process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;

console.log('\n🔐 Google Calendar Authentication:');
if (hasJWT) {
  console.log('✅ JWT service account configured (recommended for server-to-server)');
} else {
  console.log('❌ No Google Calendar JWT authentication configured');
  console.log('   Required: GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY');
}

if (missingVars === 0) {
  console.log('\n🟢 All required environment variables are set!\n');
} else {
  console.error(`\n🔴 Missing ${missingVars} required environment variables.\n`);
  console.error('Please add these to your .env file or environment variables.\n');
  process.exit(1);
}

if (optionalMissingVars > 0) {
  console.log(`\n⚠️  Missing ${optionalMissingVars} optional environment variables.\n`);
}
