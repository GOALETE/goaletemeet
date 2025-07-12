# GoaleteMeet - Admin Dashboard Guide

## Overview
Comprehensive admin dashboard for managing users, subscriptions, meetings, and system operations.

## Dashboard Access
- URL: `/admin`
- Authentication: Admin passcode required
- Stored in environment: `ADMIN_PASSCODE`

## Core Features

### 1. User Management
**Location**: Users tab in admin dashboard

**Key Capabilities**:
- View all registered users with their subscription details
- Search and filter by name, email, phone, plan type
- Export user data to CSV
- Individual user detail modals showing complete subscription history

**Important Note**: 
- **Each subscription is now displayed as an individual entry**
- Users with multiple subscriptions appear multiple times in subscription views
- This ensures every payment and date association is tracked separately

### 2. Subscription Management
**Location**: Subscriptions tab

**View Types**:
- **All Subscriptions**: Every subscription record as individual entries
- **This Week**: Subscriptions starting this week
- **Upcoming**: Future subscriptions

**Data Structure**:
```
Each row represents ONE subscription with:
- User information (name, email)
- Plan type (daily, monthly, unlimited)
- Date range (start - end)
- Status (active, upcoming, finished)
- Payment details (price, order ID)
```

**Filtering Options**:
- Status: active, upcoming, finished
- Plan type: daily, monthly, unlimited
- Date ranges: custom start/end dates
- Search: by user name, email, or order ID

### 3. Calendar & Meetings
**Location**: Calendar tab

**Features**:
- View all scheduled meetings
- Create new meetings
- Manage meeting links and descriptions
- Track meeting attendance
- Send invitations and reminders

### 4. Session Management
**Location**: Session Users tab

**Capabilities**:
- View users registered for specific dates
- Check attendance for meetings
- Manage daily session participants

### 5. Analytics & Revenue
**Location**: Analytics tab

**Metrics Available**:
- Total revenue by period
- User registration trends
- Plan popularity analysis
- Payment success rates

### 6. Cron Job Management
**Location**: Cron Management tab

**Automated Tasks**:
- Daily invite sending
- Meeting reminders
- Subscription expiry notifications
- Status updates

## Data Export

### User Data Export
- **Full Database Export**: Complete user and subscription data
- **Filtered CSV**: Current view data only
- **Custom Reports**: Date range and filter-based exports

### Revenue Reports
- Monthly revenue summaries
- Plan-wise revenue breakdown
- Payment status tracking

## User Detail Modal

**Triggered by**: Clicking any user row in any view

**Information Displayed**:
- Complete user profile
- Total subscription count and amount spent
- **All subscriptions** with detailed information
- Payment history with order IDs
- Meeting attendance records

**Actions Available**:
- Edit user information
- View subscription details
- Check payment status
- Send manual invitations
- Add user to meetings (create subscriptions)

## Search and Filtering

### Global Search
- Works across: names, emails, phone numbers
- Case-insensitive partial matching
- Real-time filtering

### Advanced Filters
- **Plan Type**: Filter by subscription plan
- **Status**: Active, expired, upcoming subscriptions
- **Date Range**: Custom start and end dates
- **Source**: Registration source tracking
- **Payment Status**: Successful, pending, failed payments

## Key Admin Operations

### Daily Tasks
1. Check new registrations
2. Verify payment statuses
3. Send meeting invites
4. Monitor attendance

### Weekly Tasks
1. Review revenue reports
2. Update meeting schedules
3. Handle user support requests
4. Export data backups

### Monthly Tasks
1. Generate comprehensive reports
2. Update system configurations
3. Review and optimize performance
4. Plan upcoming features

## Important Implementation Notes

### Subscription Display Logic
- **Previous Behavior**: Only showed most recent subscription per user
- **Current Behavior**: Shows each subscription as individual entry
- **Reason**: Every registration carries payment and date associations that must be tracked separately

### Database Relationships
- Users can have multiple subscriptions (`subscriptions Subscription[]`)
- Each subscription has independent payment and date tracking
- Family plans create multiple subscriptions under related users

### API Endpoints
- `/api/admin/users`: User-centric data with aggregated subscription info
- `/api/admin/subscriptions`: Individual subscription records with user details
- Both endpoints support filtering, searching, and pagination

## Troubleshooting

### Common Issues
1. **Data Not Loading**: Check admin passcode and network connection
2. **Export Failures**: Verify data range and filter settings
3. **Search Not Working**: Clear filters and try again

### Performance Optimization
- Use date range filters for large datasets
- Limit export sizes for better performance
- Use pagination for viewing large user lists

### Data Integrity
- Regular backups automated through cron jobs
- Payment verification through Razorpay webhooks
- Subscription status updates run daily
