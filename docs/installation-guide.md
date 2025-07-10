# GOALETE Installation Guide

## 📋 Prerequisites

### System Requirements
- **Node.js 18+** (LTS recommended)
- **npm 9+** or **yarn 1.22+**
- **Git** for version control
- **PostgreSQL 14+** (local or cloud)

### Required Services
- **Google Cloud Project** with Calendar API enabled
- **Google Service Account** with calendar permissions
- **PostgreSQL Database** (local or cloud instance)

### Optional Services
- **Vercel Account** (for deployment)
- **Email Service Provider** (for notifications)
- **Monitoring Service** (for production)

## 🚀 Installation Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd goaletemeet
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Environment Configuration

#### Create Environment File
```bash
cp .env.example .env.local
```

#### Required Environment Variables
```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/goalete"

# Google Calendar API
GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID="primary"

# Application Settings
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Meeting Configuration
DEFAULT_MEETING_PLATFORM="google-meet"
DEFAULT_MEETING_TIME="21:00"
DEFAULT_MEETING_DURATION="60"
DEFAULT_TIMEZONE="UTC"

# Email Configuration (Optional)
EMAIL_FROM="noreply@goalete.com"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Security Settings
ENCRYPTION_KEY="your-32-character-encryption-key"
JWT_SECRET="your-jwt-secret-key"

# Feature Flags
ENABLE_FAMILY_PLANS="true"
ENABLE_CROSS_DOMAIN_INVITES="true"
ENABLE_MEETING_ANALYTICS="true"
```

### 4. Google Cloud Setup

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API

#### Create Service Account
1. Navigate to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Name: `goalete-calendar-service`
4. Description: `Service account for GOALETE meeting management`
5. Click **Create and Continue**

#### Generate Service Account Key
1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Choose **JSON** format
5. Download and save the key file securely

#### Extract Credentials
From the downloaded JSON file, extract:
- `client_email` → `GOOGLE_CLIENT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

### 5. Database Setup

#### Local PostgreSQL Installation

**Windows:**
```powershell
# Using chocolatey
choco install postgresql

# Or download from https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
# Using homebrew
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Database Creation
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE goalete;

# Create user (optional)
CREATE USER goalete_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE goalete TO goalete_user;

# Exit PostgreSQL
\q
```

#### Prisma Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed database with initial data
npx prisma db seed
```

### 6. Verification

#### Test Database Connection
```bash
npx prisma studio
```
This opens Prisma Studio at `http://localhost:5555`

#### Test Google Calendar API
```bash
# Run environment test
node scripts/test-env.js

# Run Google Calendar test
npm run test:google-calendar
```

#### Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to verify installation.

## 🔧 Post-Installation Configuration

### 1. Admin User Setup

#### Create First Admin User
```bash
# Run admin setup script
node scripts/create-admin-user.js
```

Or manually via Prisma Studio:
1. Open Prisma Studio: `npx prisma studio`
2. Navigate to `User` table
3. Create new record with `isAdmin: true`

### 2. Cron Job Configuration

#### Vercel Cron (Production)
Already configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron-daily-invites",
      "schedule": "0 12 * * *"
    }
  ]
}
```

#### Local Development Cron
```bash
# Install cron simulator
npm install -g node-cron-simulator

# Run daily cron manually
curl http://localhost:3000/api/cron-daily-invites
```

### 3. Security Configuration

#### SSL Certificate (Production)
```bash
# For custom domain deployment
npm install -g @vercel/cli
vercel domains add yourdomain.com
vercel certs add yourdomain.com
```

#### Environment Security
```bash
# Encrypt sensitive environment variables
node scripts/encrypt-env.js
```

## 🧪 Testing Installation

### Run All Tests
```bash
# Complete test suite
npm run test:all

# Security verification
npm run test:security

# Database tests
npm run test:database

# API endpoint tests
npm run test:api
```

### Manual Testing Checklist

- [ ] Database connection successful
- [ ] Google Calendar API working
- [ ] Admin dashboard accessible
- [ ] Meeting creation functional
- [ ] Email notifications working
- [ ] Cron jobs executing
- [ ] Security features active

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify DATABASE_URL format
echo $DATABASE_URL
```

#### Google Calendar API Errors
```bash
# Verify service account permissions
node scripts/test-google-auth.js

# Check API quotas in Google Console
```

#### Environment Variable Issues
```bash
# Validate all required env vars
node scripts/check-env.js

# Test environment loading
npm run test:env
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process (replace PID)
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

## 📁 Project Structure

```
goalete/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   └── components/        # React components
├── docs/                  # Documentation
├── lib/                   # Utility libraries
├── prisma/                # Database schema
├── scripts/               # Utility scripts
├── public/                # Static assets
└── types/                 # TypeScript types
```

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update Prisma
npx prisma migrate dev
```

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name feature-name

# Deploy to production
npx prisma migrate deploy
```

### Environment Updates
```bash
# Backup current environment
cp .env.local .env.backup

# Update environment variables
nano .env.local

# Test new configuration
npm run test:env
```

## 📞 Support

### Documentation Resources
- [API Documentation](./api-documentation.md)
- [Security Guide](./security-implementation-summary.md)
- [Development Guide](./development-guide.md)
- [Deployment Guide](./deployment-guide.md)

### Getting Help
- Check the [Troubleshooting](#troubleshooting) section
- Review the [FAQ](./faq.md)
- Run diagnostic scripts in `/scripts` directory
- Check logs in development console

### Environment Testing
```bash
# Complete environment validation
npm run test:installation

# Individual component tests
npm run test:database
npm run test:google-api
npm run test:email
```

---

**Next Steps:** After successful installation, proceed to the [Development Guide](./development-guide.md) for local development setup.
