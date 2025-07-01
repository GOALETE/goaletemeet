# GoaleteMeet

A comprehensive meeting management platform for scheduling, sending invites, and managing online meetings for GOALETE Club sessions.

## 🚀 Features

- **Meeting Management**: Create and manage Google Meet and Zoom meetings
- **Subscription System**: Handle user subscriptions with various plan types
- **Automated Invites**: Daily email invites to all active subscribers
- **Admin Dashboard**: Manage users, meetings, and subscriptions
- **Email Notifications**: Rich HTML emails with calendar invites
- **Next.js 15**: Built with the latest Next.js 15 App Router architecture

## 📋 Requirements

- Node.js 20.x or higher
- PostgreSQL database
- Razorpay account for payment processing
- SMTP server for email sending
- (Optional) Google Calendar API credentials for Google Meet integration
- (Optional) Zoom API credentials for Zoom meetings integration

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/goaletemeet.git
   cd goaletemeet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. Run the environment check to ensure all required variables are set:
   ```bash
   npm run check-env
   ```

5. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
goaletemeet/
├── app/                   # Next.js App Router structure
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── admin/             # Admin dashboard pages
│   ├── form/              # Registration form page
│   └── generated/         # Generated Prisma client
├── docs/                  # Documentation
├── lib/                   # Shared utilities
├── prisma/                # Database schema & migrations
├── public/                # Static assets
├── scripts/               # Test and utility scripts
├── types/                 # TypeScript type definitions
└── trash/                 # Deprecated code (to be removed)
```

## 📦 Environment Variables

The application requires several environment variables to be set. See `.env.example` for a complete list. Critical variables include:

- `DATABASE_URL`: PostgreSQL connection string
- `RAZORPAY_KEY_ID` and `RAZORPAY_SECRET_KEY`: Razorpay API credentials
- `SMTP_*` variables: Email server configuration
- `ADMIN_PASSCODE`: Password for admin dashboard access

## 📚 Documentation

- [API Documentation](./docs/api-documentation.md)
- [Email System](./docs/email-system.md)
- [Meeting Integration](./docs/meeting-integration-tests.md)
- [Error Handling & Testing](./docs/error-handling-testing.md)
- [Family Plan Implementation](./docs/family-plan-implementation.md)
- [Subscription Protection](./docs/subscription-protection.md)

## 🧪 Testing

The project includes comprehensive test scripts:

```bash
# Run all core tests
npm run test:all

# Individual test suites
npm run test:email-functionality   # Test email sending
npm run test:daily-cron            # Test daily invite cron job
npm run test:meeting-management    # Test meeting creation
npm run test:api-endpoints         # Test API endpoints
npm run test:family-plan           # Test family plan registration
```

## 📦 API Endpoints

### Core Endpoints

- `POST /api/check-subscription` - Check if a user can subscribe
- `GET /api/cron-daily-invites` - Send daily meeting invites
- `POST /api/send-meeting-invite` - Send meeting invite to a user
- `POST /api/createUser` - Create a new user
- `POST /api/createOrder` - Create a payment order

### Admin Endpoints

- `POST /api/admin/auth` - Authenticate admin access
- `GET /api/admin/users` - Get all users with filtering and pagination
- `POST /api/admin/users` - Create a new user
- `GET /api/admin/user` - Get user details by ID
- `PATCH /api/admin/user` - Update user details and permissions
- `GET /api/admin/subscriptions` - Get subscription data with filtering
- `GET /api/admin/session-users` - Get users for a specific session date
- `GET /api/admin/statistics` - Get comprehensive dashboard statistics
- `GET /api/admin/export` - Export user and subscription data as CSV
- `GET /api/admin/count-users` - Count active users for a specific date
- `GET /api/admin/meetings` - Get meeting data with filtering
- `POST /api/admin/meetings` - Create new meetings
- `GET /api/admin/today-active/meeting` - Get today's active meeting details

## 🛡️ Next.js 15 Compliance

This project is built with Next.js 15 using the App Router. It implements several Next.js 15 best practices:

- Uses `next/image` for optimized image loading
- Server components where possible
- Client components where interactivity is needed
- Metadata API for improved SEO
- Fonts optimization with `next/font`
- Optimized tailwind.config.js

## 🧰 Development Tools

- **Linting**: `npm run lint`
- **Fixing lint issues**: `npm run lint:fix`
- **Type checking**: TypeScript compiler
- **Environment checking**: `npm run check-env`

## 🚀 Deployment

The project is configured for deployment on Vercel:

```bash
npm run build
npm run start
```

A `vercel.json` configuration is included for Vercel deployment settings.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
