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

# GoAlete Club - Subscription Meeting App

## Tech Stack

- Next.js (App router, React)
- Neon DB (PostgreSQL, via Prisma)
- Razorpay (payments)
- Zoom & Google Calendar APIs (meeting access)
- Vercel (deploy, cron jobs)

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
- Daily invite automation (cron: `/api/cron-send-invites`)
- Simple admin dashboard (WIP)

## Integrations

- **Razorpay**: See [Razorpay docs](https://razorpay.com/docs/api/) for client and webhook setup.
- **Google Calendar API**: Use a service account to create events and invite emails.
- **Zoom API**: Use JWT or OAuth to update allowed emails for the static meeting.

## Security

- Meeting links are never public.
- Only paid/active emails can join, enforced via API and daily calendar/invite logic.

---

PRs, feedback, and issues welcome!