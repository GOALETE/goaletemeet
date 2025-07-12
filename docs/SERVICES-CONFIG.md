# GoaleteMeet - Services Configuration

## Environment Setup

### Required Environment Variables

#### Core Application
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/goaletemeet"

# Admin Authentication
ADMIN_PASSCODE="your-secure-admin-password"

# Next.js Configuration
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

#### Payment Integration (Razorpay)
```env
# Razorpay Configuration
RAZORPAY_KEY_ID="rzp_test_or_live_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="webhook_secret_from_razorpay"
```

#### Email Service (Gmail SMTP)
```env
# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-gmail-address@gmail.com"
SMTP_PASS="your-gmail-app-password"
FROM_EMAIL="your-gmail-address@gmail.com"
FROM_NAME="GoaleteMeet"
```

#### Google Calendar Integration
```env
# Google Service Account (Base64 encoded JSON)
GOOGLE_SERVICE_ACCOUNT_KEY="base64-encoded-service-account-json"

# Google Calendar Settings
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"
ADMIN_EMAIL="admin@yourdomain.com"
```

#### Cron & Automation
```env
# Cron Configuration
CRON_SECRET="your-cron-secret-for-vercel"
VERCEL_CRON_SECRET="vercel-specific-cron-secret"

# Meeting Defaults
DEFAULT_MEETING_TIME=21:00               # 9 PM IST (daily meeting time)
DEFAULT_MEETING_DURATION=60              # Meeting duration in minutes  
DEFAULT_MEETING_PLATFORM=google-meet     # Default meeting platform
```

## Service Configuration Details

### 1. Database (PostgreSQL)

#### Local Development
```bash
# Using Docker
docker run --name goaletemeet-db \
  -e POSTGRES_DB=goaletemeet \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:13

# Connection URL
DATABASE_URL="postgresql://admin:password@localhost:5432/goaletemeet"
```

#### Production (Recommended Providers)
- **Vercel Postgres**: Integrated with Vercel deployment
- **Supabase**: Managed PostgreSQL with additional features
- **Railway**: Simple PostgreSQL hosting
- **Neon**: Serverless PostgreSQL

#### Database Setup
```bash
# Install Prisma CLI
npm install prisma @prisma/client

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (if needed)
npx prisma db seed
```

### 2. Payment Service (Razorpay)

#### Account Setup
1. Create Razorpay account at https://razorpay.com
2. Get API keys from Dashboard → Settings → API Keys
3. Configure webhook endpoints for payment confirmations

#### Webhook Configuration
- **Endpoint**: `https://yourdomain.com/api/razorpay/webhook`
- **Events**: `payment.captured`, `payment.failed`
- **Secret**: Generate and store in environment variables

#### Test Configuration
```env
# Test Mode
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxx"
RAZORPAY_KEY_SECRET="test_secret_key"

# Live Mode (Production)
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxx"
RAZORPAY_KEY_SECRET="live_secret_key"
```

### 3. Email Service (Gmail SMTP)

#### Gmail Setup
1. Enable 2-Factor Authentication on Gmail account
2. Generate App Password:
   - Gmail → Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail" application
3. Use app password (not regular Gmail password) in SMTP_PASS

#### Alternative Email Providers
- **SendGrid**: Enterprise email delivery
- **Mailgun**: Transactional email service
- **AWS SES**: Amazon Simple Email Service

#### Email Configuration
```env
# Gmail SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"  # Use TLS
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
```

### 4. Google Calendar Integration

#### Service Account Setup
1. Go to Google Cloud Console
2. Create new project or select existing
3. Enable Google Calendar API
4. Create Service Account:
   - IAM & Admin → Service Accounts → Create
   - Download JSON key file
5. Share calendar with service account email

#### Domain-Wide Delegation (Optional)
For enterprise Google Workspace:
1. Enable domain-wide delegation for service account
2. Add OAuth scopes in Admin Console
3. Configure calendar access permissions

#### Calendar Configuration
```bash
# Convert service account JSON to base64
cat service-account.json | base64 -w 0

# Add to environment
GOOGLE_SERVICE_ACCOUNT_KEY="base64-encoded-json-here"
```

### 5. Cron Jobs (Vercel)

#### Vercel Cron Configuration
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-invites",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/status-updates",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### Cron Endpoints
- `/api/cron/daily-invites`: Send daily meeting invitations (8 AM IST)
- `/api/cron/status-updates`: Update subscription statuses (midnight)

#### Security
```env
# Cron secret for authentication
CRON_SECRET="your-secure-cron-secret"
VERCEL_CRON_SECRET="vercel-specific-secret"
```

## Deployment Configuration

### Vercel Deployment

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Deploy Application
```bash
# First deployment
vercel

# Subsequent deployments
vercel --prod
```

#### 3. Environment Variables
Add all environment variables in Vercel Dashboard:
- Project → Settings → Environment Variables
- Add each variable for Production, Preview, and Development

#### 4. Domain Configuration
- Add custom domain in Vercel Dashboard
- Configure DNS records with domain provider
- SSL certificates automatically managed

### Alternative Deployment Options

#### 1. Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

#### 2. Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring & Logging

### Application Monitoring
- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking and performance monitoring
- **LogRocket**: Session replay and debugging

### Database Monitoring
- **Prisma Studio**: Database GUI for development
- **pgAdmin**: PostgreSQL administration tool
- **Database provider dashboards**: Built-in monitoring

### Email Monitoring
- **Gmail Console**: Sending statistics and limits
- **SMTP logs**: Track delivery status and errors

## Security Configuration

### API Security
```typescript
// Rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### Environment Security
- Store all secrets in environment variables
- Use different credentials for development/production
- Rotate API keys regularly
- Monitor access logs

### Database Security
- Use connection pooling
- Implement prepared statements (Prisma handles this)
- Regular database backups
- Monitor for suspicious queries

## Backup & Recovery

### Database Backups
```bash
# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

### Application Backups
- Code: Git repository with remote backup
- Environment: Secure storage of environment variables
- Database: Regular automated backups

### Recovery Procedures
1. **Database Recovery**: Restore from latest backup
2. **Application Recovery**: Redeploy from Git repository
3. **Configuration Recovery**: Restore environment variables
4. **Service Recovery**: Reconfigure external service integrations

## Performance Optimization

### Database Performance
- Index frequently queried fields
- Use database connection pooling
- Optimize query patterns
- Monitor slow queries

### Application Performance
- Enable Next.js caching
- Optimize images and assets
- Use CDN for static content
- Implement proper error boundaries

### Email Performance
- Batch email sending
- Queue management for large volumes
- Monitor sending limits
- Implement retry logic

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Test database connection
npx prisma db push --preview-feature
```

#### Email Sending
```bash
# Test SMTP configuration
npm run test:email
```

#### API Authentication
```bash
# Verify admin passcode
curl -H "Authorization: Bearer YOUR_ADMIN_PASSCODE" \
  https://yourdomain.com/api/admin/users
```

### Log Analysis
- Check Vercel function logs
- Monitor database connection errors
- Review email delivery reports
- Analyze payment webhook logs

### Support Resources
- Next.js documentation
- Prisma documentation
- Vercel support
- Provider-specific documentation
