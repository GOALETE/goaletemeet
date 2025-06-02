# GOALETE Meeting API Integration Tests

This directory contains test scripts for validating the Google Meet and Zoom API integrations in the GOALETE application.

## Prerequisites

Before running the tests, make sure you have:

1. Set up your environment variables in a `.env` file (use `.env.example` as a template)
2. Installed all dependencies (`npm install`)
3. A running database (PostgreSQL)

## Required Environment Variables

### General Settings
- `DEFAULT_MEETING_PLATFORM`: Either "google-meet" or "zoom"
- `DEFAULT_MEETING_TIME`: Format "HH:MM" in 24-hour format (e.g., "21:00")
- `DEFAULT_MEETING_DURATION`: Duration in minutes (e.g., "60")
- `ADMIN_PASSCODE`: Admin password for API authentication
- `EMAIL_USER`: Email address for sending invites
- `EMAIL_PASSWORD`: Email password (for Gmail, use an App Password)

### Google Meet Integration
If using Google Meet, you need:
- `GOOGLE_CLIENT_EMAIL`: Service account email from Google Cloud Console
- `GOOGLE_PRIVATE_KEY`: Private key for the service account
- `GOOGLE_CALENDAR_ID`: Calendar ID (use "primary" or a specific calendar ID)

### Zoom Integration
If using Zoom, you need:
- `ZOOM_JWT_TOKEN`: JWT token from Zoom Developer portal
- `ZOOM_USER_ID`: Email of the Zoom account creating meetings

## Setting Up Google Meet Integration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. Enable the Google Calendar API
4. Create a service account with Calendar API permissions
5. Download the JSON key file
6. Extract the client_email and private_key from the JSON file
7. Add these to your .env file

## Setting Up Zoom Integration

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create a JWT App
3. Use the API Key/Secret to generate a JWT token
4. Add the token and your Zoom email to your .env file

## Running the Tests

### Run All Tests
```bash
npm run test:meetings
```

### Run Individual Tests
- Test environment variables: `npm run test:meeting-env`
- Test meeting API integration: `npm run test:meeting-api`
- Test admin meetings API: `npm run test:admin-meetings`
- Test daily cron job: `npm run test:cron-invites`

## Test Descriptions

1. **Meeting Environment Variables Test**
   - Verifies that all required environment variables are set
   - Validates the format of meeting settings

2. **Meeting API Integration Test**
   - Tests direct API calls to Google Meet and Zoom
   - Creates test meetings and verifies the responses
   - Tests adding users to meetings

3. **Admin Meetings API Test**
   - Tests the `/api/admin/meetings` endpoints
   - Creates meetings via the API
   - Retrieves meeting listings

4. **Daily Cron Job Test**
   - Tests the daily meeting creation functionality
   - Tests the cron job that sends meeting invites
   - Verifies that emails are sent to users with active subscriptions

## Troubleshooting

### Google Meet Issues
- Ensure the service account has Calendar API permissions
- Verify the private key format (it should include newlines as "\n")
- Make sure the calendar ID exists and is accessible by the service account

### Zoom Issues
- Check that your JWT token is valid and not expired
- Verify the Zoom user account is active and has the necessary permissions
- Ensure the app has the correct scopes enabled

### Email Issues
- For Gmail, make sure you're using an App Password if 2FA is enabled
- Check SMTP settings and permissions
