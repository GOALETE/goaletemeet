# GoaleteMeet - Documentation

## Overview
GoaleteMeet is a comprehensive meeting management platform built with Next.js that automates Google Meet session scheduling, user registration, payment processing, and administrative management.

## Documentation Structure

### 1. [USER-GUIDE.md](./USER-GUIDE.md)
**For End Users**: Complete guide for registration, plan selection, payment, and meeting access.

**Contents**:
- Registration process and available plans
- Payment and subscription management
- Meeting access and calendar integration
- Support and FAQ

### 2. [ADMIN-GUIDE.md](./ADMIN-GUIDE.md)
**For Administrators**: Comprehensive admin dashboard documentation and management procedures.

**Contents**:
- Dashboard access and authentication
- User and subscription management with individual subscription tracking
- Meeting and calendar administration
- Analytics, reporting, and data export
- Daily/weekly/monthly operational procedures

**Key Feature**: Individual subscription tracking - each subscription is displayed as a separate entry to maintain payment and date associations.

### 3. [ARCHITECTURE.md](./ARCHITECTURE.md)
**For Developers**: Technical architecture, database schema, and system design decisions.

**Contents**:
- Technology stack and component architecture
- Database models and relationships
- API design patterns and authentication
- Key architectural decisions (especially subscription-centric data display)
- Performance and security considerations

### 4. [SERVICES-CONFIG.md](./SERVICES-CONFIG.md)
**For DevOps**: Complete service configuration, deployment, and environment setup.

**Contents**:
- Environment variables and configuration
- Database, payment, email, and calendar service setup
- Deployment procedures (Vercel, Railway, Docker)
- Monitoring, backup, and troubleshooting

## Quick Start

### For Users
1. Visit the registration form
2. Select your plan and complete payment
3. Check email for meeting details and calendar invites

### For Administrators
1. Access `/admin` with admin passcode
2. View subscription-centric data (each subscription as individual entry)
3. Manage users, meetings, and generate reports

### For Developers
1. Clone repository and install dependencies
2. Configure environment variables (see SERVICES-CONFIG.md)
3. Set up database and run migrations
4. Start development server

### For DevOps
1. Follow SERVICES-CONFIG.md for complete environment setup
2. Configure all external services (Razorpay, Gmail, Google Calendar)
3. Deploy using Vercel or alternative platforms
4. Set up monitoring and backup procedures

## Important Updates

### Subscription Management Enhancement
The system has been updated to display **individual subscription entries** instead of user-aggregated data:

- **Previous**: Users appeared once with only their most recent subscription
- **Current**: Each subscription appears as a separate entry with full payment and date tracking
- **Benefit**: Complete visibility of all payments and subscription periods per user

This change affects:
- Admin dashboard subscription views
- Data export functionality  
- User detail modals (now show complete subscription history)
- Revenue tracking and analytics

## Support and Maintenance

### For Technical Issues
- Check ARCHITECTURE.md for system understanding
- Review SERVICES-CONFIG.md for configuration issues
- Use admin dashboard for user management

### For Business Operations
- Use ADMIN-GUIDE.md for daily operations
- Reference USER-GUIDE.md for user support
- Generate reports through admin dashboard

### For Development
- Follow architecture patterns in ARCHITECTURE.md
- Test changes with local environment setup
- Deploy using procedures in SERVICES-CONFIG.md

## Project Status
- ✅ Individual subscription tracking implemented
- ✅ Admin dashboard fully functional
- ✅ Payment and meeting automation active
- ✅ Documentation consolidated and updated
- ✅ All core features operational
