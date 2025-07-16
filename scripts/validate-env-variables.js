#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * 
 * This script validates that all environment variables used throughout
 * the codebase are properly defined and configured.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// All environment variables used throughout the codebase
const ENVIRONMENT_VARIABLES = {
  // Database
  DATABASE_URL: { required: true, description: 'Database connection string' },
  
  // Admin Authentication
  ADMIN_PASSCODE: { required: true, description: 'Admin authentication passcode' },
  ADMIN_EMAIL: { required: true, description: 'Admin email for authentication and notifications' },
  
  // Payment Gateway
  NEXT_PUBLIC_RAZORPAY_KEY_ID: { required: true, description: 'Razorpay public key ID (used in frontend and backend)' },
  RAZORPAY_KEY_SECRET: { required: true, description: 'Razorpay secret key' },
  
  // Email Configuration
  EMAIL_PASSWORD: { required: true, description: 'SMTP email password' },
  
  // Application Configuration
  NEXT_PUBLIC_BASE_URL: { required: false, description: 'Public base URL for the application' },
  NODE_ENV: { required: false, description: 'Node.js environment (development, production)' },
  VERCEL_ENV: { required: false, description: 'Vercel environment type' },
  
  // Meeting Defaults
  DEFAULT_MEETING_PLATFORM: { required: false, description: 'Default meeting platform (google-meet, zoom)' },
  DEFAULT_MEETING_TIME: { required: false, description: 'Default meeting time (HH:MM format)' },
  DEFAULT_MEETING_DURATION: { required: false, description: 'Default meeting duration in minutes' },
  
  // Google Integration
  GOOGLE_CLIENT_EMAIL: { required: false, description: 'Google service account email' },
  GOOGLE_PRIVATE_KEY: { required: false, description: 'Google service account private key' },
  GOOGLE_CALENDAR_ID: { required: false, description: 'Google Calendar ID' },
  
  // Zoom Integration
  ZOOM_CLIENT_ID: { required: false, description: 'Zoom client ID' },
  ZOOM_CLIENT_SECRET: { required: false, description: 'Zoom client secret' },
  ZOOM_ACCOUNT_ID: { required: false, description: 'Zoom account ID' },
  ZOOM_USER_ID: { required: false, description: 'Zoom user ID' },
  
  // Messaging Controls
  ENABLE_EMAIL_MESSAGING: { required: false, description: 'Enable/disable email messaging' },
  ENABLE_WHATSAPP_MESSAGING: { required: false, description: 'Enable/disable WhatsApp messaging' },
  
  // Special Configurations
  SPECIAL_EMAILS: { required: false, description: 'Comma-separated list of special emails' },
  
  // CI/CD and Monitoring
  CI: { required: false, description: 'CI environment flag' },
  SENTRY_DSN: { required: false, description: 'Sentry error monitoring DSN' },
  
  // Prisma Configuration
  PRISMA_DISABLE_WARNINGS: { required: false, description: 'Disable Prisma warnings' },
  PRISMA_CLIENT_ENGINE_TYPE: { required: false, description: 'Prisma client engine type' },
  PRISMA_QUERY_ENGINE_BINARY: { required: false, description: 'Prisma query engine binary path' },
  PRISMA_QUERY_ENGINE_LIBRARY: { required: false, description: 'Prisma query engine library path' },
  PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION: { required: false, description: 'Prisma data proxy client version' },
  
  // DotEnv Configuration
  DOTENV_KEY: { required: false, description: 'DotEnv encryption key' },
  DOTENV_CONFIG_DEBUG: { required: false, description: 'DotEnv configuration debug flag' }
};

function validateEnvironmentVariables() {
  console.log('🔍 Validating Environment Variables...\n');
  
  const missing = [];
  const warnings = [];
  const configured = [];
  
  // Check each environment variable
  Object.entries(ENVIRONMENT_VARIABLES).forEach(([varName, config]) => {
    const value = process.env[varName];
    const isSet = value !== undefined && value !== '';
    
    if (config.required && !isSet) {
      missing.push({ varName, description: config.description });
    } else if (!config.required && !isSet) {
      warnings.push({ varName, description: config.description });
    } else {
      configured.push({ varName, description: config.description, hasValue: isSet });
    }
  });
  
  // Report results
  console.log('✅ CONFIGURED VARIABLES:');
  configured.forEach(({ varName, description }) => {
    console.log(`   ${varName}: ${description}`);
  });
  
  if (warnings.length > 0) {
    console.log('\n⚠️  OPTIONAL VARIABLES (not set):');
    warnings.forEach(({ varName, description }) => {
      console.log(`   ${varName}: ${description}`);
    });
  }
  
  if (missing.length > 0) {
    console.log('\n❌ MISSING REQUIRED VARIABLES:');
    missing.forEach(({ varName, description }) => {
      console.log(`   ${varName}: ${description}`);
    });
    console.log('\n💡 Please set these variables in your .env file before running the application.');
    return false;
  }
  
  console.log('\n🎉 All required environment variables are configured!');
  return true;
}

function checkEnvFileExists() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('💡 Copy .env.example to .env and configure your values:');
    console.log('   cp .env.example .env');
    return false;
  }
  return true;
}

function validateMeetingIntegration() {
  console.log('\n📺 Validating Meeting Integration...');
  
  const platform = process.env.DEFAULT_MEETING_PLATFORM || 'google-meet';
  console.log(`   Default Platform: ${platform}`);
  
  if (platform === 'google-meet') {
    const googleEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const googleKey = process.env.GOOGLE_PRIVATE_KEY;
    console.log(`   Google Service Account: ${googleEmail ? '✅' : '❌'}`);
    console.log(`   Google Private Key: ${googleKey ? '✅' : '❌'}`);
  }
  
  if (platform === 'zoom') {
    const zoomClientId = process.env.ZOOM_CLIENT_ID;
    const zoomClientSecret = process.env.ZOOM_CLIENT_SECRET;
    const zoomAccountId = process.env.ZOOM_ACCOUNT_ID;
    console.log(`   Zoom Client ID: ${zoomClientId ? '✅' : '❌'}`);
    console.log(`   Zoom Client Secret: ${zoomClientSecret ? '✅' : '❌'}`);
    console.log(`   Zoom Account ID: ${zoomAccountId ? '✅' : '❌'}`);
  }
}

function main() {
  console.log('🚀 GOALETE MEET - Environment Variables Validation\n');
  
  // Check if .env file exists
  if (!checkEnvFileExists()) {
    process.exit(1);
  }
  
  // Load environment variables
  require('dotenv').config();
  
  // Validate environment variables
  const isValid = validateEnvironmentVariables();
  
  // Additional validations
  validateMeetingIntegration();
  
  console.log('\n' + '='.repeat(60));
  if (isValid) {
    console.log('✅ Environment validation completed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Environment validation failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentVariables,
  checkEnvFileExists,
  validateMeetingIntegration,
  ENVIRONMENT_VARIABLES
};
