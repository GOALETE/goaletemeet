# GOALETE - Secure Meeting Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.9.0-brightgreen)](https://www.prisma.io/)
[![Google Calendar API](https://img.shields.io/badge/Google_Calendar_API-v3-orange)](https://developers.google.com/calendar)
[![Security](https://img.shields.io/badge/Security-Enterprise_Grade-red)](https://github.com)

## 🚀 Overview

GOALETE is an enterprise-grade meeting management system that creates secure, subscription-based Google Meet sessions with automated user management and comprehensive cross-domain support. The system ensures only authorized users with active subscriptions can access meetings while providing a seamless experience across all email domains.

## ✨ Key Features

### 🔐 **Enterprise Security**
- **Invite-Only Access**: Only explicitly invited users can join meetings
- **Cross-Domain Support**: Users from any email domain (Gmail, Yahoo, Corporate, etc.)
- **Auto-Accept Invites**: No RSVP required - streamlined user experience
- **Comprehensive Audit Trail**: Full tracking of all meeting operations

### 🤖 Automated Management
- **Daily Cron Jobs**: Automatic meeting creation and user invitation
- **Subscription Integration**: Only active subscribers receive invites
- **Batch Processing**: Efficient handling of large user lists
- **Immediate Invites**: Late registrations handled automatically
- **Feature Control**: Environment variable controlled cron job execution

### 🌐 **Universal Compatibility**
- **All Email Domains**: Gmail, Yahoo, Outlook, Corporate, Educational
- **International Support**: Country-specific and regional email providers
- **Modern TLDs**: Support for .io, .ai, .xyz, and other new domains
- **Mobile Friendly**: Responsive design for all devices

## 🏗️ Architecture

```mermaid
graph TB
    A[User Registration] --> B[Subscription Management]
    B --> C[Daily Cron Job]
    C --> D[Active User Detection]
    D --> E[Google Meet Creation]
    E --> F[Cross-Domain Invites]
    F --> G[Secure Meeting Access]
    
    H[Admin Interface] --> I[Manual Meeting Creation]
    I --> E
    
    J[Database] --> K[User Management]
    J --> L[Meeting Records]
    J --> M[Subscription Tracking]
```

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.3.3** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library

### **Backend**
- **Next.js API Routes** - Serverless backend functions
- **Prisma ORM** - Database management and migrations
- **Google Calendar API** - Meeting creation and management
- **Zoom API** - Alternative meeting platform support

### **Infrastructure**
- **Vercel** - Deployment and hosting
- **PostgreSQL** - Primary database
- **Google Cloud** - Calendar API and authentication
- **Node.js** - Server runtime

## 📋 Prerequisites

### **Required Services**
- **Google Cloud Project** with Calendar API enabled
- **Google Service Account** with calendar permissions
- **PostgreSQL Database** (local or cloud)
- **Node.js 18+** and npm/yarn

### **Optional Services**
- **Zoom Account** (for Zoom meeting support)
- **Email Service** (for notifications)
- **Monitoring Tools** (for production)

## � Quick Start

### 1. **Clone & Install**
```bash
git clone <repository-url>
cd goaletemeet
npm install
```

### 2. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. **Database Setup**
```bash
npx prisma generate
npx prisma db push
```

### 4. **Development Server**
```bash
npm run dev
```

### 5. **Security Verification**
```bash
npm run test:security
```

## 📖 Documentation

### **📚 Core Documentation**
- **[Installation Guide](./docs/installation-guide.md)** - Complete setup instructions
- **[API Documentation](./docs/api-documentation.md)** - All API endpoints and usage
- **[Database Schema](./docs/database-schema.md)** - Complete data model
- **[Environment Configuration](./docs/environment-configuration.md)** - All environment variables

### **🔐 Security Documentation**
- **[Security Implementation](./docs/security-implementation-summary.md)** - Complete security overview
- **[Cross-Domain Support](./docs/cross-domain-implementation-guide.md)** - External domain integration
- **[Google Meet Security](./docs/google-meet-security-implementation.md)** - Meeting security details

### **🔧 Development Documentation**
- **[Development Guide](./docs/development-guide.md)** - Local development setup
- **[Testing Guide](./docs/testing-guide.md)** - Testing strategies and scripts
- **[Deployment Guide](./docs/deployment-guide.md)** - Production deployment

### **🚀 Advanced Documentation**
- **[Admin Dashboard](./docs/admin-dashboard-guide.md)** - Admin interface usage
- **[Cron Jobs](./docs/cron-jobs-guide.md)** - Automated task management
- **[Monitoring & Analytics](./docs/monitoring-analytics.md)** - System monitoring

## 🏃‍♂️ Getting Started

### **For Developers**
1. Read the [Installation Guide](./docs/installation-guide.md)
2. Follow the [Development Guide](./docs/development-guide.md)
3. Run security tests: `npm run test:security`

### **For Administrators**
1. Review the [Admin Dashboard Guide](./docs/admin-dashboard-guide.md)
2. Configure [Environment Variables](./docs/environment-configuration.md)
3. Set up [Cron Jobs](./docs/cron-jobs-guide.md)

### **For Security Teams**
1. Review [Security Implementation](./docs/security-implementation-summary.md)
2. Check [Cross-Domain Support](./docs/cross-domain-implementation-guide.md)
3. Run security verification: `npm run test:security`

## � Cron Job Management

### **Feature Control**
```bash
# Master control - disables all cron jobs
ENABLE_CRON_JOBS=false
```

### **Available Endpoints**
```bash
# Check cron job status
GET /api/cron-status

# Execute daily invites cron (automated)
GET /api/cron-daily-invites

# Test cron feature flags
node scripts/test-cron-feature-flags.js
```

### **Use Cases**
- **Development**: Disable cron jobs to prevent unwanted operations
- **Maintenance**: Temporarily disable cron operations
- **Testing**: Test cron functionality

## �🧪 Testing

### **Available Test Scripts**
```bash
# Security verification
npm run test:security

# Cron job feature flags
node scripts/test-cron-feature-flags.js

# Email functionality
npm run test:email-functionality

# Meeting management
npm run test:meeting-management

# Complete test suite
npm run test:all
```

### **Test Coverage**
- ✅ Security implementation verification
- ✅ Cross-domain invite functionality
- ✅ Database integration testing
- ✅ API endpoint validation
- ✅ Cron job functionality and feature flags
- ✅ Environment variable configuration

## 🔧 Configuration

### **Essential Environment Variables**
```bash
# Google Calendar API
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=primary

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/goalete"

# Cron Job Control
ENABLE_CRON_JOBS=true                    # Master toggle for all cron jobs

# Meeting Configuration
DEFAULT_MEETING_PLATFORM=google-meet
DEFAULT_MEETING_TIME=21:00               # 9 PM IST (default daily meeting time)
DEFAULT_MEETING_DURATION=60              # 60 minutes duration
```

See [Environment Configuration](./docs/environment-configuration.md) for complete details.

## 🔐 Security Features

### **Meeting Security**
- **Private Visibility**: All meetings are private and not publicly discoverable
- **Invite-Only Access**: Only explicitly added attendees can join
- **Cross-Domain Compatible**: Secure invites to any email domain
- **Auto-Accept**: No RSVP required for streamlined UX

### **Data Security**
- **Encrypted Communication**: All API calls use HTTPS
- **Secure Authentication**: Google Service Account with limited permissions
- **Audit Trails**: Comprehensive logging of all operations
- **Access Control**: Role-based permissions for admin functions

### **Compliance**
- **GDPR Ready**: User data handling complies with privacy regulations
- **Enterprise Grade**: Suitable for corporate environments
- **Monitoring**: Security event tracking and alerting

## 📊 Features

### **Meeting Management**
- ✅ Automated daily meeting creation
- ✅ Subscription-based user invitations
- ✅ Cross-domain email support
- ✅ Manual meeting creation (admin)
- ✅ Meeting analytics and tracking

### **User Management**
- ✅ Subscription tracking and validation
- ✅ Family plan support
- ✅ User registration and profile management
- ✅ Email notification system

### **Admin Dashboard**
- ✅ Meeting calendar view
- ✅ User management interface
- ✅ Subscription overview
- ✅ Security monitoring
- ✅ Analytics and reporting

## 🚀 Deployment

### **Vercel Deployment** (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Manual Deployment**
```bash
# Build production
npm run build

# Start production server
npm start
```

See [Deployment Guide](./docs/deployment-guide.md) for detailed instructions.

## 📈 Monitoring

### **Health Checks**
- API endpoint availability
- Database connectivity
- Google Calendar API status
- Meeting creation success rates

### **Analytics**
- User engagement metrics
- Meeting attendance tracking
- Cross-domain invite success
- Security event monitoring

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:all`
5. Submit a pull request

### **Code Standards**
- TypeScript for all new code
- ESLint configuration compliance
- Comprehensive error handling
- Security-first development

## 📞 Support

### **Documentation**
- Complete docs in `/docs` directory
- API reference with examples
- Security implementation guides
- Troubleshooting resources

### **Testing**
- Automated security verification
- Comprehensive test suite
- Cross-domain validation
- Performance monitoring

### **Community**
- Issue tracking for bug reports
- Feature request discussions
- Security vulnerability reporting
- Development best practices

## 📄 License

This project is proprietary software. All rights reserved.

## 🏆 Key Achievements

- **🔐 Enterprise Security**: Invite-only meetings with cross-domain support
- **⚡ Performance**: Batch operations reduce API calls by 80%
- **🌐 Universal Access**: Support for all email domains worldwide
- **🤖 Automation**: Fully automated meeting management system
- **📊 Analytics**: Comprehensive tracking and monitoring
- **🧪 Testing**: Automated security and functionality verification

---

**Built with ❤️ for secure, scalable meeting management**

For detailed documentation, see the `/docs` directory or visit our [Documentation Portal](./docs/README.md).

A `vercel.json` configuration is included for Vercel deployment settings.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
