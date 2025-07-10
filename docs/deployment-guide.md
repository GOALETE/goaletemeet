# GOALETE Deployment Guide

## 🚀 Overview

This comprehensive deployment guide covers deploying GOALETE to various platforms, from development staging to production environments, with emphasis on security, performance, and reliability.

## 🏗️ Deployment Architecture

### Supported Platforms
1. **Vercel** (Recommended) - Seamless Next.js deployment
2. **Railway** - Full-stack deployment with database
3. **AWS** - Enterprise-grade scalable deployment
4. **Google Cloud Platform** - Native Google Calendar integration
5. **Docker** - Containerized deployment for any platform

### Architecture Components
```mermaid
graph TB
    A[Load Balancer] --> B[Next.js Application]
    B --> C[PostgreSQL Database]
    B --> D[Google Calendar API]
    B --> E[Email Service]
    F[Cron Scheduler] --> B
    G[File Storage] --> B
    H[Monitoring] --> B
```

## 🎯 Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- GitHub repository
- PostgreSQL database (Vercel Postgres or external)
- Google Cloud project with Calendar API

### Quick Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from local machine
vercel

# Deploy to production
vercel --prod
```

### Automated Deployment Setup

#### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings

#### 2. Environment Variables
```bash
# Add environment variables via Vercel CLI
vercel env add DATABASE_URL production
vercel env add GOOGLE_CLIENT_EMAIL production
vercel env add GOOGLE_PRIVATE_KEY production
vercel env add NEXTAUTH_SECRET production

# Or use Vercel dashboard
# Go to Project Settings > Environment Variables
```

#### 3. Vercel Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron-daily-invites",
      "schedule": "0 12 * * *"
    }
  ],
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 4. Database Setup (Vercel Postgres)
```bash
# Create Vercel Postgres database
vercel postgres create goalete-db

# Connect to your project
vercel env pull .env.local

# Run database migrations
npx prisma migrate deploy
```

#### 5. Custom Domain
```bash
# Add custom domain
vercel domains add yourdomain.com

# Configure DNS
# Add CNAME record: www -> cname.vercel-dns.com
# Add A record: @ -> 76.76.19.19
```

### Production Verification
```bash
# Test production deployment
curl https://yourdomain.com/api/health

# Verify cron jobs
curl https://yourdomain.com/api/cron-daily-invites

# Check admin access
curl https://yourdomain.com/admin
```

## 🚂 Railway Deployment

### Setup Railway Project
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Railway Configuration
```yaml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"

[[services]]
name = "web"
source = "."

[[services]]
name = "postgres"
source = "postgres:14"
```

### Environment Variables
```bash
# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set GOOGLE_CLIENT_EMAIL="..."
railway variables set GOOGLE_PRIVATE_KEY="..."
railway variables set NEXTAUTH_SECRET="..."
```

## ☁️ AWS Deployment

### Architecture Components
- **EC2** - Application hosting
- **RDS PostgreSQL** - Database
- **Application Load Balancer** - Traffic distribution
- **CloudFront** - CDN and static assets
- **Lambda** - Cron job execution
- **S3** - File storage

### Deployment Steps

#### 1. Infrastructure Setup
```bash
# Install AWS CLI
aws configure

# Create VPC and subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier goalete-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password yourpassword \
  --allocated-storage 20
```

#### 2. Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### 3. Docker Compose (Development)
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/goalete
    depends_on:
      - db
    
  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=goalete
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### 4. EC2 Deployment
```bash
# Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-group-ids sg-yoursgid

# SSH into instance and deploy
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Docker and Docker Compose
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo usermod -a -G docker ec2-user

# Deploy application
git clone your-repo
cd goaletemeet
docker-compose up -d
```

## 🐳 Docker Deployment

### Production Docker Setup
```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "server.js"]
```

### Multi-Stage Build
```bash
# Build production image
docker build -f Dockerfile.prod -t goalete:latest .

# Run container
docker run -d \
  --name goalete-app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e GOOGLE_CLIENT_EMAIL="..." \
  -e GOOGLE_PRIVATE_KEY="..." \
  goalete:latest
```

## 🔧 Environment-Specific Configurations

### Development Environment
```bash
# .env.development
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
DATABASE_URL="postgresql://localhost:5432/goalete_dev"
NEXTAUTH_URL="http://localhost:3000"
```

### Staging Environment
```bash
# .env.staging
NODE_ENV=staging
DEBUG=false
LOG_LEVEL=info
DATABASE_URL="postgresql://staging-db:5432/goalete_staging"
NEXTAUTH_URL="https://staging.goalete.com"
API_RATE_LIMIT_REQUESTS=200
```

### Production Environment
```bash
# .env.production
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
DATABASE_URL="postgresql://prod-db:5432/goalete?sslmode=require"
NEXTAUTH_URL="https://goalete.com"
API_RATE_LIMIT_REQUESTS=50
ENABLE_SECURITY_HEADERS=true
```

## 📊 Database Migration Strategy

### Migration Workflow
```bash
# 1. Backup production database
pg_dump -h prod-host -U username goalete > backup_$(date +%Y%m%d).sql

# 2. Test migrations on staging
npx prisma migrate deploy --preview-feature

# 3. Deploy to production during maintenance window
npx prisma migrate deploy

# 4. Verify migration success
npx prisma migrate status
```

### Zero-Downtime Migrations
```bash
# For breaking changes, use blue-green deployment
# 1. Deploy new version to green environment
# 2. Run migrations on green database
# 3. Switch traffic to green environment
# 4. Keep blue environment as rollback option
```

## 🔐 Security Configuration

### SSL/TLS Setup
```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d goalete.com -d www.goalete.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Security Headers
```javascript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  }
}
```

### Firewall Configuration
```bash
# UFW firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📈 Monitoring and Logging

### Health Checks
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    // Database check
    prisma.$queryRaw`SELECT 1`,
    
    // Google Calendar API check
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${await getGoogleAccessToken()}` }
    }),
    
    // Email service check
    testEmailConnection()
  ])

  const isHealthy = checks.every(check => check.status === 'fulfilled')
  
  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status === 'fulfilled',
      googleCalendar: checks[1].status === 'fulfilled',
      emailService: checks[2].status === 'fulfilled'
    }
  }, { 
    status: isHealthy ? 200 : 503 
  })
}
```

### Application Monitoring
```bash
# Using PM2 for process management
npm install -g pm2

# Start application with PM2
pm2 start npm --name "goalete" -- start

# Monitor application
pm2 monit

# Setup log rotation
pm2 install pm2-logrotate
```

### Error Tracking
```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})

export function captureError(error: Error, context?: any) {
  Sentry.captureException(error, {
    extra: context
  })
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:security

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          
      - name: Run post-deployment tests
        run: |
          sleep 30  # Wait for deployment to be live
          npm run test:e2e:production
```

### Automated Testing
```bash
# Post-deployment verification
npm run test:production

# Health check verification
curl -f https://goalete.com/api/health

# Security verification
npm run test:security:production
```

## 🚨 Backup and Recovery

### Database Backup Strategy
```bash
# Automated daily backups
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > backup_${DATE}.sql.gz

# Upload to S3
aws s3 cp backup_${DATE}.sql.gz s3://goalete-backups/

# Cleanup old backups (keep 30 days)
find /backups -name "backup_*.sql.gz" -mtime +30 -delete
```

### Disaster Recovery Plan
```bash
# Recovery procedure
# 1. Restore database from backup
gunzip -c backup_20240201_120000.sql.gz | psql -h $DB_HOST -U $DB_USER $DB_NAME

# 2. Verify data integrity
npm run test:database:integrity

# 3. Restart application
pm2 restart goalete

# 4. Run health checks
curl https://goalete.com/api/health
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Backup created
- [ ] Monitoring configured

### Deployment
- [ ] Deploy to staging first
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Test critical functionality
- [ ] Monitor for errors

### Post-Deployment
- [ ] Health checks passing
- [ ] Application accessible
- [ ] Database connectivity confirmed
- [ ] Google Calendar integration working
- [ ] Email functionality operational
- [ ] Cron jobs scheduled
- [ ] Monitoring alerts configured

## 🔧 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

#### Database Connection Issues
```bash
# Test database connectivity
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER

# Check connection string format
echo $DATABASE_URL

# Verify SSL requirements
psql "$DATABASE_URL" -c "SELECT version();"
```

#### Google Calendar API Issues
```bash
# Verify service account credentials
node -e "console.log(process.env.GOOGLE_CLIENT_EMAIL)"

# Test API connectivity
curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  "https://www.googleapis.com/calendar/v3/users/me/calendarList"
```

### Performance Optimization
```bash
# Enable Next.js optimizations
# next.config.ts
module.exports = {
  experimental: {
    outputStandalone: true,
  },
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

# Database connection pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"
```

---

**Related Documentation:**
- [Installation Guide](./installation-guide.md)
- [Environment Configuration](./environment-configuration.md)
- [Security Implementation](./security-implementation-summary.md)
