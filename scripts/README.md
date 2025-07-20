# GOALETE Scripts Documentation

## Available Scripts

This directory contains essential scripts for testing and validating the JWT-based Google Calendar API integration.

### Environment & Authentication Scripts

- **`check-env.js`** - Validates all required environment variables are set, focuses on JWT service account configuration
- **`validate-env-variables.js`** - Additional environment validation
- **`test-service-account.ts`** - Tests JWT service account authentication with Google Calendar API

### API Testing & Validation Scripts

- **`quick-api-validation.ts`** - Quick validation test for Google Calendar API functionality
- **`validate-google-calendar-api.ts`** - Comprehensive Google Calendar API compliance validation
- **`verify-optimized-meeting-creation.ts`** - Tests optimized meeting creation with credit efficiency

## Usage

Run these scripts using npm commands defined in package.json:

```bash
# Test JWT service account authentication
npm run test:service-account

# Quick API validation
npm run test:api-validation

# Comprehensive API compliance testing
npm run test:api-compliance

# Test optimized meeting creation
npm run test:optimized

# Run all tests
npm run test:all

# Check environment variables
npm run check-env
```

## Authentication Method

This project uses **JWT Service Account** authentication for Google Calendar API access:
- More secure for server-to-server communication
- No user interaction required
- Perfect for automated meeting creation and management

### Required Environment Variables

```
GOOGLE_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
GOOGLE_CALENDAR_ID=goals@goalete.com
```

## Cleaned Up

The following obsolete files have been removed:
- All OAuth2-related scripts and documentation
- Redundant testing scripts
- Debug and development utility scripts
- Old email testing scripts
- Cron job testing scripts
- Admin API testing scripts
- Family plan testing scripts
- Meeting management testing scripts

This cleanup focuses the codebase on the current JWT-based authentication approach and removes unnecessary clutter.
