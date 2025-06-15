// check-env.js
// A utility script to check for required environment variables

console.log('Checking environment variables...');
const requiredEnvVars = [
  { name: 'DATABASE_URL', description: 'PostgreSQL database connection URL' },
  { name: 'RAZORPAY_KEY_ID', description: 'Razorpay Key ID for payment processing' },
  { name: 'RAZORPAY_SECRET_KEY', description: 'Razorpay Secret Key for payment processing' },
  { name: 'ADMIN_PASSCODE', description: 'Admin panel access code' },
  { name: 'SMTP_HOST', description: 'SMTP server host for email sending' },
  { name: 'SMTP_PORT', description: 'SMTP server port' },
  { name: 'SMTP_USER', description: 'SMTP username' },
  { name: 'SMTP_PASS', description: 'SMTP password' },
  { name: 'EMAIL_FROM', description: 'Sender email address' },
  { name: 'NEXT_PUBLIC_BASE_URL', description: 'Base URL for the application (optional)', optional: true },
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
