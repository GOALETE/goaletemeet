# Email System Documentation

## Overview

The email system in GoaleteMeet handles several types of communications:

1. **Welcome Emails** - Sent to users after they complete registration and payment
2. **Meeting Invites** - Sent daily to active subscribers with links to join sessions
3. **Admin Notifications** - Sent to administrators when new users register

## Email Templates

All email templates are defined in `lib/email.ts` and use HTML with inline CSS for styling.

### Plan Type Display

The system automatically converts plan type codes to user-friendly display names:

| Plan Type Code | Display Name |
|----------------|--------------|
| daily          | Daily Session |
| monthly        | Monthly Plan |
| monthlyFamily  | Monthly Family Plan |
| unlimited      | Unlimited Plan (admin only) |
| (other values) | Original value is used |

## Family Plan Emails

For the Monthly Family plan, the system sends:
- Welcome emails to both registered users
- A special admin notification email that includes details of both users
- Daily meeting invites to both users

## Testing Emails

Several test scripts are available to verify email functionality:

```bash
# Test welcome email
npm run test:email

# Test admin notification email
npm run test:admin-notification

# Test admin notification with different plan types
npm run test:admin-plan-types

# Test daily meeting invite cron job
npm run test:cron-invites
```

### Environment Variables

To run email tests, the following environment variables must be set in your `.env` file:

```
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASSWORD=your_app_password
ADMIN_EMAIL=admin_email@example.com
```

**Note:** For Gmail, you need to use an App Password, not your regular password.
Generate one at: https://myaccount.google.com/apppasswords

## Troubleshooting

### Common Issues

1. **Encoding Problems** - If special characters like currency symbols (₹) or emojis appear incorrectly, check the character encoding in the email templates.

2. **Plan Type Display** - If plan types are displaying incorrectly, check the plan type mapping in the email functions.

3. **Email Not Sending** - Verify your environment variables and make sure your Gmail account allows less secure apps or that you're using an App Password.
