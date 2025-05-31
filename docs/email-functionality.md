# Email Functionality in GoaleteMeet

## Overview

GoaleteMeet implements email functionality using Nodemailer with Gmail SMTP for sending:
1. Welcome emails after successful payment
2. Daily meeting invites with calendar attachments
3. Immediate meeting invites for same-day subscriptions

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Email settings (Gmail SMTP)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
```

**Important**: For Gmail, you need to use an "App Password" not your regular password.
Generate one at: https://myaccount.google.com/apppasswords

### Email Templates

Email templates are defined in `lib/email.ts` with responsive HTML designs for:
- Welcome emails
- Meeting invite emails

## Email Types

### Welcome Email

Sent after successful payment processing with:
- Subscription plan details
- Payment information
- Start and end dates
- Instructions for joining meetings

### Meeting Invite Email

Contains:
- Meeting link (Google Meet or Zoom)
- Calendar attachment (.ics file)
- Date and time information
- Platform-specific details

## CRON Job for Daily Invites

A daily CRON job runs at 8:00 AM to:
1. Create a new meeting link if none exists for the day
2. Send meeting invites to all active subscribers
3. Include platform-specific details (Google Meet or Zoom)

## Platform Support

The system supports both Google Meet and Zoom:
- Platform is configurable in the MeetingSetting model
- Email templates adjust based on the selected platform
- Meeting links can be platform-specific

## Testing Email Functionality

To test the email functionality:
1. Set up proper environment variables
2. Run the test script:
   ```
   npm run test:email
   ```
3. This will send test emails (welcome and meeting invites) to verify functionality
4. Check your inbox for the test emails

You can also test by:
1. Creating a test subscription
2. Triggering the payment success endpoint
3. Verifying welcome email delivery
4. Running the CRON job to test daily invites

## Troubleshooting

If emails are not being sent:
1. Check environment variables are set correctly
2. Verify Gmail account settings allow app access
3. Check logs for specific error messages
4. Test with a different email service if needed
