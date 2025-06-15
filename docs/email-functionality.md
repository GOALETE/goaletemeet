# Email Functionality in GoaleteMeet

## Overview

GoaleteMeet implements email functionality using Nodemailer with Gmail SMTP for sending:
1. Welcome emails after successful payment
2. Daily meeting invites with calendar attachments
3. Immediate meeting invites for same-day subscriptions
4. Admin notifications for new registrations

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Email settings (Gmail SMTP)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
ADMIN_EMAIL="admin@example.com"
```

**Important**: For Gmail, you need to use an "App Password" not your regular password.
Generate one at: https://myaccount.google.com/apppasswords

### Email Templates

Email templates are defined in `lib/email.ts` with responsive HTML designs for:
- Welcome emails
- Meeting invite emails
- Admin notification emails
- Family plan special notifications

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

### Admin Notification Email

#### Single User Registration
For individual plans (daily, monthly), includes:
- User details (name, email, phone, etc.)
- Subscription information
- Payment details

#### Family Plan Registration
For monthly family plans, includes:
- Details of both registered users
- Combined subscription information
- Single payment details
- Both subscription IDs for tracking

## Family Plan Email Flow

### Registration Process

For the Monthly Family plan, the registration form collects information for two users:
1. Primary user details (first person)
2. Secondary user details (second person)
3. Single payment for both users

### Backend Processing

When a family plan payment is processed:
1. Two separate user records are created in the database
2. Two separate subscription records are created (each with half the total price)
3. Each subscription is linked to its respective user

### Email Notifications

After successful payment:
1. **Welcome Emails**: Both users receive individual welcome emails
   - Each email contains the user's specific details
   - Both emails reference the same payment information

2. **Admin Notification**: A single admin notification is sent
   - Contains details of both users in a family-specific template
   - Shows both subscription IDs for tracking
   - Clearly indicates this is a family plan registration

3. **Meeting Invites**: Both users receive their own meeting invites
   - Daily CRON job sends separate invites to each email
   - Both users can independently access meetings

### Testing Family Plan Emails

To test family plan emails:
1. Register with the Monthly Family plan option
2. Complete the payment process
3. Verify both welcome emails are received
4. Check admin notification contains both users
5. Run the daily CRON job to verify meeting invites

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
