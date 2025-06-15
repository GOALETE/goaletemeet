This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

# Goalete Club - Subscription Meeting App

## Tech Stack

- Next.js (App router, React)
- Neon DB (PostgreSQL, via Prisma)
- Razorpay (payments)
- Gmail SMTP (email notifications)
- Zoom & Google Calendar APIs (meeting access)
- Vercel (deploy, cron jobs)

## Subscription Plans

The application offers the following subscription plans:

1. **Daily Session** - Rs. 299 for 1-day access
2. **Monthly Plan** - Rs. 2999 for 30-day access (single user)
3. **Monthly Family Plan** - Rs. 4499 for 30-day access (two users)

Family plans allow two users to register at once, with each user receiving their own account and meeting access.

## Setup

1. **Clone & Install**
   ```
   git clone <your-repo>
   cd <your-repo>
   pnpm install
   ```

2. **Configure .env**
   ```
   DATABASE_URL=postgresql://<user>:<pass>@<neon-url>:5432/<db>
   RAZORPAY_KEY_ID=...
   RAZORPAY_KEY_SECRET=...
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   GOOGLE_SERVICE_ACCOUNT_JSON=...
   ZOOM_JWT=...
   ```

3. **Prisma Migrate**
   ```
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Run Locally**
   ```
   pnpm dev
   ```

5. **Deploy**
   - Connect your repo to Vercel
   - Set environment variables
   - Deploy!

## Features

- Elegant subscription form (see `/components/RegistrationForm.tsx`)
- Razorpay integration
- Daily invite automation (cron: `/api/cron-daily-invites`)
- Welcome emails after successful payment
- Platform-specific meeting invites (Google Meet or Zoom)
- Simple admin dashboard (WIP)

## Integrations

- **Razorpay**: See [Razorpay docs](https://razorpay.com/docs/api/) for client and webhook setup.
- **Gmail SMTP**: Used for sending welcome emails and meeting invites with calendar attachments. See [Email Documentation](./docs/email-functionality.md).
- **Google Calendar API**: Use a service account to create events and invite emails.
- **Zoom API**: Use JWT or OAuth to update allowed emails for the static meeting.

## Security

- Meeting links are never public.
- Only paid/active emails can join, enforced via API and daily calendar/invite logic.

## Documentation

- [Email System](./docs/email-system.md) - Email templates and notification system
- [Email Functionality](./docs/email-functionality.md) - Implementation details for email features
- [Pricing Guide](./docs/pricing-guide.md) - Plan pricing and configuration
- [Subscription Protection](./docs/subscription-protection.md) - Authentication and access control
- [Family Plan Implementation](./docs/family-plan-implementation.md) - Detailed guide for the Monthly Family Plan

---

PRs, feedback, and issues welcome!