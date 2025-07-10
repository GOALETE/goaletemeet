# Environment Configuration Guide

## 📋 Overview

This guide covers all environment variables required for GOALETE, including required settings, optional configurations, and environment-specific values for development, staging, and production.

## 🔧 Environment Files

### File Structure
```
goalete/
├── .env.example          # Template with all variables
├── .env.local           # Local development (gitignored)
├── .env.development     # Development environment
├── .env.staging         # Staging environment
└── .env.production      # Production environment (secure)
```

### Loading Priority
1. `.env.local` (highest priority, local development)
2. `.env.development` / `.env.staging` / `.env.production`
3. `.env` (lowest priority, defaults)

## 🔑 Required Environment Variables

### Database Configuration
```bash
# Primary database connection
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Example configurations:
# Local development
DATABASE_URL="postgresql://goalete_user:password123@localhost:5432/goalete"

# Production (with SSL)
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Cloud provider examples:
# Vercel Postgres
DATABASE_URL="postgres://user:pass@host.vercel-storage.com:5432/db"

# Railway
DATABASE_URL="postgresql://user:pass@containers-us-west-1.railway.app:6543/railway"

# Supabase
DATABASE_URL="postgresql://postgres:pass@db.supabase.co:5432/postgres"
```

### Google Calendar API
```bash
# Service account email (required)
GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"

# Private key (required) - Keep on single line with \n for line breaks
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Calendar ID (required)
GOOGLE_CALENDAR_ID="primary"
# Or use specific calendar:
# GOOGLE_CALENDAR_ID="c_1234567890abcdef@group.calendar.google.com"

# Project ID (optional but recommended)
GOOGLE_PROJECT_ID="your-google-cloud-project-id"
```

### Authentication
```bash
# NextAuth configuration (required for admin panel)
NEXTAUTH_SECRET="your-nextauth-secret-minimum-32-characters"
NEXTAUTH_URL="http://localhost:3000"

# Production example:
NEXTAUTH_URL="https://your-domain.com"
```

## ⚙️ Application Configuration

### Cron Job Control
```bash
# Master cron job toggle
ENABLE_CRON_JOBS="true"           # Enable/disable all cron job execution
# Options: "true", "false"
```

### Meeting Settings
```bash
# Default meeting platform
DEFAULT_MEETING_PLATFORM="google-meet"
# Options: "google-meet", "zoom", "teams"

# Default meeting time (24-hour format)
DEFAULT_MEETING_TIME="21:00"

# Default meeting duration (minutes)
DEFAULT_MEETING_DURATION="60"

# Default timezone
DEFAULT_TIMEZONE="UTC"
# Examples: "America/New_York", "Europe/London", "Asia/Tokyo"

# Meeting limits
MAX_MEETING_ATTENDEES="50"
MAX_MEETING_DURATION="480"  # 8 hours

# Meeting security defaults
MEETING_DEFAULT_VISIBILITY="private"
MEETING_REQUIRE_APPROVAL="false"
MEETING_ALLOW_GUEST_INVITES="false"
```

### Subscription Management
```bash
# Subscription validation
SUBSCRIPTION_GRACE_PERIOD_DAYS="7"
FAMILY_PLAN_MAX_MEMBERS="6"
INDIVIDUAL_PLAN_MAX_MEETINGS_PER_MONTH="30"
FAMILY_PLAN_MAX_MEETINGS_PER_MONTH="100"

# Trial period
TRIAL_PERIOD_DAYS="14"
ENABLE_TRIAL_ACCOUNTS="true"
```

## 📧 Email Configuration

### SMTP Settings (Optional)
```bash
# Email service configuration
EMAIL_FROM="noreply@goalete.com"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"  # true for 465, false for other ports
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-specific-password"

# Alternative providers:
# Outlook/Hotmail
EMAIL_HOST="smtp-mail.outlook.com"
EMAIL_PORT="587"

# Yahoo
EMAIL_HOST="smtp.mail.yahoo.com"
EMAIL_PORT="587"

# SendGrid
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_USER="apikey"
EMAIL_PASS="your-sendgrid-api-key"
```

### Email Templates
```bash
# Email template settings
EMAIL_MEETING_INVITE_TEMPLATE="meeting-invite"
EMAIL_WELCOME_TEMPLATE="welcome"
EMAIL_SUBSCRIPTION_EXPIRY_TEMPLATE="subscription-expiry"

# Email features
ENABLE_EMAIL_NOTIFICATIONS="true"
ENABLE_MEETING_REMINDERS="true"
MEETING_REMINDER_HOURS="24,2"  # Send reminders 24h and 2h before
```

## 🚀 Feature Flags

### Core Features
```bash
# Family plan support
ENABLE_FAMILY_PLANS="true"

# Cross-domain meeting invites
ENABLE_CROSS_DOMAIN_INVITES="true"

# Meeting analytics and tracking
ENABLE_MEETING_ANALYTICS="true"

# Admin dashboard features
ENABLE_ADMIN_DASHBOARD="true"
ENABLE_USER_MANAGEMENT="true"
ENABLE_MEETING_MANAGEMENT="true"

# API features
ENABLE_API_RATE_LIMITING="true"
ENABLE_API_ANALYTICS="true"
```

### Experimental Features
```bash
# Beta features (use with caution)
ENABLE_ZOOM_INTEGRATION="false"
ENABLE_TEAMS_INTEGRATION="false"
ENABLE_SLACK_NOTIFICATIONS="false"
ENABLE_ADVANCED_ANALYTICS="false"

# Debug features (development only)
ENABLE_DEBUG_LOGGING="false"
ENABLE_REQUEST_LOGGING="false"
ENABLE_PERFORMANCE_MONITORING="false"
```

## 🔒 Security Configuration

### Encryption & Security
```bash
# Application security
ENCRYPTION_KEY="your-32-character-encryption-key-here"
JWT_SECRET="your-jwt-secret-key-minimum-256-bits"
SESSION_SECRET="your-session-secret-key"

# API security
API_RATE_LIMIT_REQUESTS="100"  # Requests per minute
API_RATE_LIMIT_WINDOW="60000"  # Window in milliseconds

# CORS settings
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"
CORS_CREDENTIALS="true"

# Security headers
ENABLE_SECURITY_HEADERS="true"
ENABLE_CSRF_PROTECTION="true"
```

### Admin Security
```bash
# Admin access
ADMIN_EMAIL="admin@goalete.com"
ADMIN_SETUP_TOKEN="your-one-time-admin-setup-token"

# Admin session
ADMIN_SESSION_TIMEOUT="3600"  # 1 hour
ADMIN_REQUIRE_2FA="false"     # Two-factor authentication

# IP restrictions (optional)
ADMIN_ALLOWED_IPS="192.168.1.1,10.0.0.1"
```

## 🌍 Environment-Specific Configurations

### Development (.env.local)
```bash
# Development specific
NODE_ENV="development"
DEBUG="true"
LOG_LEVEL="debug"

# Local database
DATABASE_URL="postgresql://goalete_user:password@localhost:5432/goalete_dev"

# Local URLs
NEXTAUTH_URL="http://localhost:3000"
BASE_URL="http://localhost:3000"

# Development features
ENABLE_DEBUG_LOGGING="true"
ENABLE_REQUEST_LOGGING="true"
SKIP_EMAIL_VERIFICATION="true"

# Google Calendar (development)
GOOGLE_CALENDAR_ID="primary"  # Use primary calendar for testing
```

### Staging (.env.staging)
```bash
# Staging environment
NODE_ENV="staging"
DEBUG="false"
LOG_LEVEL="info"

# Staging database
DATABASE_URL="postgresql://user:pass@staging-db.company.com:5432/goalete_staging"

# Staging URLs
NEXTAUTH_URL="https://staging.goalete.com"
BASE_URL="https://staging.goalete.com"

# Staging features
ENABLE_MEETING_ANALYTICS="true"
ENABLE_EMAIL_NOTIFICATIONS="true"
SKIP_EMAIL_VERIFICATION="false"

# Staging security (less restrictive)
API_RATE_LIMIT_REQUESTS="200"
```

### Production (.env.production)
```bash
# Production environment
NODE_ENV="production"
DEBUG="false"
LOG_LEVEL="warn"

# Production database (with connection pooling)
DATABASE_URL="postgresql://user:pass@prod-db.company.com:5432/goalete?sslmode=require&connection_limit=20"

# Production URLs
NEXTAUTH_URL="https://goalete.com"
BASE_URL="https://goalete.com"

# Production security (strict)
API_RATE_LIMIT_REQUESTS="50"
ENABLE_SECURITY_HEADERS="true"
ENABLE_CSRF_PROTECTION="true"

# Production monitoring
ENABLE_PERFORMANCE_MONITORING="true"
ENABLE_ERROR_REPORTING="true"

# Email (production service)
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_USER="apikey"
EMAIL_PASS="SG.your-sendgrid-key"
```

## 🔍 Validation & Testing

### Environment Validation Script
```bash
# Run environment validation
node scripts/check-env.js

# Test specific components
npm run test:database
npm run test:google-api
npm run test:email
```

### Required Variables Checklist
- [ ] `DATABASE_URL` - Database connection
- [ ] `GOOGLE_CLIENT_EMAIL` - Google service account
- [ ] `GOOGLE_PRIVATE_KEY` - Google private key
- [ ] `GOOGLE_CALENDAR_ID` - Calendar to use
- [ ] `NEXTAUTH_SECRET` - Authentication secret
- [ ] `NEXTAUTH_URL` - Application URL

### Optional Variables Checklist
- [ ] Email configuration (if notifications enabled)
- [ ] Feature flags (based on requirements)
- [ ] Security settings (recommended for production)
- [ ] Monitoring configuration (production)

## 🚨 Security Best Practices

### Secret Management
```bash
# Use environment-specific secrets
# Never commit .env files to version control
# Use secret management services in production

# Vercel
vercel env add GOOGLE_PRIVATE_KEY

# Railway
railway variables set GOOGLE_PRIVATE_KEY="..."

# AWS Systems Manager
aws ssm put-parameter --name "/goalete/google-private-key" --value "..."
```

### Key Rotation
```bash
# Regularly rotate sensitive keys:
# - Google service account keys (annually)
# - Database passwords (quarterly)
# - JWT secrets (bi-annually)
# - API keys (as needed)
```

### Access Control
```bash
# Limit access to environment variables
# Use IAM roles and policies
# Implement least privilege principle
# Log all secret access
```

## 🔧 Environment Management Tools

### Development Tools
```bash
# Copy environment template
cp .env.example .env.local

# Load environment in shell
source .env.local

# Validate environment
node -e "console.log(process.env.DATABASE_URL)"
```

### Production Tools
```bash
# Encrypt environment file
gpg --symmetric --cipher-algo AES256 .env.production

# Deploy with environment
vercel --prod --env-file .env.production

# Backup environment settings
cp .env.production .env.production.backup.$(date +%Y%m%d)
```

## 📊 Monitoring Environment

### Health Checks
```bash
# Database connectivity
pg_isready -h host -p 5432 -U user

# Google Calendar API
curl -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
  "https://www.googleapis.com/calendar/v3/calendars/primary"

# Email service
telnet smtp.gmail.com 587
```

### Environment Status Endpoint
```javascript
// Available at /api/health
{
  "status": "healthy",
  "database": "connected",
  "google_calendar": "accessible",
  "email_service": "configured",
  "features": {
    "family_plans": true,
    "cross_domain_invites": true,
    "meeting_analytics": true
  }
}
```

## 🆘 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check connection string format
# Verify credentials and host accessibility
# Test connection outside application
psql "postgresql://user:pass@host:5432/db"
```

#### Google Calendar API Errors
```bash
# Verify service account email format
# Check private key formatting (single line with \n)
# Ensure Calendar API is enabled in Google Cloud
```

#### Email Configuration Issues
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Verify app passwords for Gmail
# Check firewall settings for SMTP ports
```

### Debug Commands
```bash
# Print all environment variables
printenv | grep -E "(DATABASE|GOOGLE|EMAIL)"

# Test environment loading
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"

# Validate specific variables
node scripts/validate-env.js
```

---

**Related Documentation:**
- [Installation Guide](./installation-guide.md)
- [Security Implementation](./security-implementation-summary.md)
- [Development Guide](./development-guide.md)
