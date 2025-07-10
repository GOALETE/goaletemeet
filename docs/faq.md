# GOALETE FAQ - Frequently Asked Questions

## 🤔 General Questions

### What is GOALETE?
GOALETE is a secure, subscription-based meeting management system that creates private Google Meet sessions with automated user invitation and comprehensive cross-domain support. It ensures only authorized users with active subscriptions can access meetings.

### What makes GOALETE different from other meeting platforms?
- **Enterprise Security**: Invite-only access with comprehensive audit trails
- **Cross-Domain Support**: Users from any email domain (Gmail, Yahoo, Corporate, etc.)
- **Automated Management**: Daily cron jobs handle meeting creation and invitations
- **Subscription Integration**: Only active subscribers receive meeting invites
- **Zero RSVP**: Streamlined experience with auto-accepted invites

### Is GOALETE suitable for enterprise use?
Yes! GOALETE is designed with enterprise-grade security features including:
- Private meeting visibility
- Guest restriction controls
- Comprehensive logging and audit trails
- Role-based admin access
- GDPR-compliant data handling

## 🚀 Installation & Setup

### What are the system requirements?
- **Node.js 18+** (LTS recommended)
- **PostgreSQL 14+** database
- **Google Cloud Project** with Calendar API enabled
- **Google Service Account** with calendar permissions

### How do I get started quickly?
1. Follow our [Installation Guide](./installation-guide.md)
2. Configure your [Environment Variables](./environment-configuration.md)
3. Run the setup: `npm install && npx prisma db push && npm run dev`
4. Visit `http://localhost:3000` to verify installation

### Can I use a different database than PostgreSQL?
Currently, GOALETE is optimized for PostgreSQL. While Prisma supports other databases, our schema and migrations are specifically designed and tested with PostgreSQL for optimal performance and security.

### Do I need a paid Google account?
You need a Google Cloud Project (free tier available) with Calendar API enabled. The service account approach works with both free and paid Google accounts.

## 🔐 Security Questions

### How secure are the meetings created by GOALETE?
Extremely secure. Every meeting created by GOALETE has:
- **Private visibility** - Not publicly discoverable
- **Invite-only access** - Only explicitly added attendees can join
- **Guest restrictions** - Attendees cannot invite others or modify meetings
- **Audit trails** - Complete logging of all meeting operations

### Can users from different email domains join meetings?
Yes! GOALETE supports cross-domain invitations, including:
- Consumer domains (Gmail, Yahoo, Outlook)
- Corporate domains (company.com, organization.org)
- Educational domains (university.edu)
- International domains (.co.uk, .de, .jp)
- Modern TLDs (.io, .ai, .xyz)

### What happens if someone's subscription expires?
- They're automatically excluded from new meeting invitations
- Existing meeting access is revoked
- They maintain read-only access to their account data
- Grace period can be configured (default: 7 days)

### Is my data GDPR compliant?
Yes, GOALETE is designed with GDPR compliance in mind:
- User consent for data processing
- Right to data export and deletion
- Encrypted data transmission
- Audit logs for data access
- Privacy-by-design architecture

## 💻 Technical Questions

### What happens if Google Calendar API goes down?
GOALETE includes fallback mechanisms:
- Queued operations retry automatically
- Health checks monitor API availability
- Admin dashboard shows service status
- Email notifications for service disruptions

### How are cron jobs handled?
- **Vercel**: Native cron support via `vercel.json`
- **Other platforms**: Use platform-specific cron or external schedulers
- **Local development**: Manual trigger via API endpoint
- **Monitoring**: Health checks verify cron execution

### Can I customize the meeting duration and timing?
Yes, through environment variables:
```bash
DEFAULT_MEETING_TIME="21:00"      # 9 PM UTC
DEFAULT_MEETING_DURATION="60"     # 60 minutes
DEFAULT_TIMEZONE="UTC"            # Timezone
```

### What email providers are supported?
GOALETE supports standard SMTP configuration for:
- Gmail (with app passwords)
- Outlook/Hotmail
- Yahoo Mail
- SendGrid
- Mailgun
- Any SMTP-compatible service

## 🎯 Feature Questions

### What's included in family plans?
- Up to 6 family members
- Shared meeting access
- Primary account management
- Individual user tracking
- Family-wide analytics
- Cost-effective pricing

### Can I integrate with other calendar platforms?
Currently, GOALETE focuses on Google Calendar for optimal security and feature integration. Future versions may include:
- Microsoft Outlook Calendar
- Apple Calendar (iCloud)
- CalDAV-compatible calendars

### How does the admin dashboard work?
The admin dashboard provides:
- Meeting calendar view with all scheduled meetings
- User management and subscription tracking
- Real-time analytics and reporting
- Security monitoring and alerts
- Bulk operations for meeting management

### Can I customize email templates?
Yes, email templates are configurable:
- Meeting invitation templates
- Welcome email templates
- Subscription expiry notifications
- Custom branding and styling

## 🚀 Deployment Questions

### Which deployment platform is recommended?
**Vercel** is our recommended platform because:
- Seamless Next.js integration
- Built-in cron job support
- Automatic scaling
- Easy environment variable management
- Excellent performance globally

### Can I deploy to my own servers?
Absolutely! GOALETE supports:
- Docker containerized deployment
- Traditional server deployment
- AWS, Google Cloud, or Azure
- On-premises enterprise deployment

### How do I handle database migrations in production?
```bash
# 1. Backup production database
pg_dump production_db > backup_$(date +%Y%m%d).sql

# 2. Test migration on staging
npx prisma migrate deploy --preview-feature

# 3. Deploy during maintenance window
npx prisma migrate deploy

# 4. Verify migration success
npx prisma migrate status
```

### What about SSL certificates?
- **Vercel**: Automatic SSL with custom domains
- **Self-hosted**: Use Let's Encrypt with certbot
- **Enterprise**: Configure your existing SSL infrastructure

## 🔧 Troubleshooting

### Installation fails with database connection error
1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL format in `.env.local`
3. Test connection: `psql "$DATABASE_URL" -c "SELECT version();"`
4. Ensure database exists and user has permissions

### Google Calendar API returns 403 Forbidden
1. Verify Calendar API is enabled in Google Cloud Console
2. Check service account credentials
3. Ensure service account has calendar access
4. Verify GOOGLE_PRIVATE_KEY formatting (single line with `\n`)

### Meetings aren't being created automatically
1. Check cron job configuration in `vercel.json`
2. Verify `/api/cron-daily-invites` endpoint is accessible
3. Test manually: `curl your-domain.com/api/cron-daily-invites`
4. Check logs for error messages

### Users can't join meetings
1. Verify meeting has private visibility
2. Check if users were properly added as attendees
3. Confirm Google Meet link is generated
4. Test meeting access with a test user

### Email notifications aren't working
1. Verify SMTP configuration in environment variables
2. Test email connection: `telnet smtp.gmail.com 587`
3. Check if using app passwords for Gmail
4. Review email service logs for errors

## 📊 Performance Questions

### How many users can GOALETE handle?
GOALETE is designed to scale:
- **Single instance**: 1,000+ active users
- **With database optimization**: 10,000+ users
- **Multi-instance deployment**: Unlimited scalability
- **Enterprise deployment**: Custom scaling solutions

### What's the maximum meeting size?
- **Google Meet**: Up to 500 participants (with Enterprise)
- **GOALETE limit**: Configurable via `MAX_MEETING_ATTENDEES`
- **Recommended**: 50-100 attendees for optimal performance
- **Performance testing**: Load tested with 200+ attendees

### How often do cron jobs run?
- **Daily invites**: Once per day at configured time
- **Cleanup tasks**: Weekly
- **Health checks**: Every 5 minutes
- **Custom crons**: Configurable via platform settings

## 🤝 Support Questions

### How do I report a security issue?
1. **DO NOT** create a public GitHub issue
2. Email security concerns to the security contact
3. Provide detailed information about the vulnerability
4. We'll respond within 24 hours with next steps

### Where can I request new features?
1. Check existing [Enhancement Proposals](./admin-dashboard-enhancement-proposal.md)
2. Create a GitHub issue with "feature request" label
3. Provide detailed use case and requirements
4. Community discussion and voting on proposals

### How do I contribute to the project?
1. Read the [Development Guide](./development-guide.md)
2. Check open issues for contribution opportunities
3. Follow our coding standards and testing requirements
4. Submit pull requests with comprehensive documentation

### What's the update schedule?
- **Security updates**: Immediate
- **Bug fixes**: Weekly releases
- **Feature updates**: Monthly releases
- **Major versions**: Quarterly

## 📚 Learning Resources

### Best practices for meeting security?
1. Review our [Security Implementation Guide](./security-implementation-summary.md)
2. Enable all recommended security features
3. Regular security audits and testing
4. Monitor meeting access logs
5. Train users on secure meeting practices

### How to optimize performance?
1. Follow [Deployment Guide](./deployment-guide.md) recommendations
2. Use database connection pooling
3. Enable Next.js optimizations
4. Monitor application performance
5. Scale horizontally when needed

### Integration examples?
Check our comprehensive [API Documentation](./api-documentation.md) for:
- Meeting creation examples
- User management workflows
- Security implementation patterns
- Cross-domain integration guides

---

**Still have questions?**

1. Check our [Documentation Portal](./README.md)
2. Search existing GitHub issues
3. Create a new issue with the "question" label
4. Join our community discussions

**Quick Links:**
- [Installation Guide](./installation-guide.md)
- [Security Documentation](./security-implementation-summary.md)
- [API Reference](./api-documentation.md)
- [Main README](../README.md)
