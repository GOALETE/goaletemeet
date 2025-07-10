# Enhanced Meeting Management System

This document outlines the enhanced meeting management system that provides admin control over meeting creation and automated daily invite distribution.

## Overview

The system is built around 3 main components as requested:

### 1. Admin Meeting Creation
**File**: `app/components/AdminCalendar.tsx`

- **Calendar Interface**: Visual calendar where admins can select dates and create meetings
- **Platform Selection**: Choose between Google Meet and Zoom (defaults to Google Meet via `DEFAULT_MEETING_PLATFORM` env var)
- **Auto-add Active Users**: Option to automatically add users with active subscriptions to meetings
- **Bulk Creation**: Support for creating meetings for multiple dates or date ranges
- **Meeting Configuration**: Customizable meeting title, description, start time, and duration

**Key Features**:
- Click on calendar dates to select them for meeting creation
- Date range selection for bulk meeting creation
- Real-time display of existing meetings on calendar
- Automatic integration with active user subscriptions

### 2. Automated Cron Job
**File**: `app/api/cron-daily-invites/route.ts`

Enhanced logic that prioritizes admin-created meetings:

1. **Admin Priority**: First checks if admin has created a meeting for today
2. **Smart User Management**: Automatically adds new active users to existing meetings
3. **Default Fallback**: Creates default meetings if no admin meetings exist
4. **Intelligent Updates**: Updates existing meetings with newly active users

**Workflow**:
```
Daily Cron Execution → Check for Admin Meetings → Add Missing Users → Send Invites
                   ↓
             No Admin Meeting → Create Default Meeting → Send Invites
```

**Environment Variables**:
- `DEFAULT_MEETING_PLATFORM`: 'google-meet' | 'zoom' (defaults to 'google-meet')
- `DEFAULT_MEETING_TIME`: Time in HH:MM format (defaults to '21:00')
- `DEFAULT_MEETING_DURATION`: Duration in minutes (defaults to 60)

### 3. Unified Messaging Service
**File**: `lib/messaging.ts`

A extensible messaging service currently supporting email with future WhatsApp support:

**Current Features**:
- Email invites with calendar attachments
- Retry mechanisms for failed sends
- Bulk messaging for multiple recipients
- Environment-based configuration

**Future Extensions**:
- WhatsApp Business API integration
- SMS notifications
- Multiple platform fallbacks

**Configuration**:
- `ENABLE_EMAIL_MESSAGING`: Enable/disable email (default: true)
- `ENABLE_WHATSAPP_MESSAGING`: Enable/disable WhatsApp (default: false)
- `FALLBACK_TO_EMAIL`: Fallback to email if other platforms fail (default: true)

## API Endpoints

### Admin Meeting Management
- **POST** `/api/admin/meetings` - Create meetings for selected dates
- **GET** `/api/admin/meetings` - Fetch meetings for date range

### Cron Job Management
- **GET** `/api/cron-daily-invites` - Main cron job endpoint
- **POST** `/api/admin/trigger-cron` - Manual cron job trigger (admin only)

### Order Processing (Enhanced)
- **PATCH** `/api/createOrder` - Now includes immediate invite functionality for same-day registrations

## Admin Dashboard Integration

### New "Cron Jobs" Tab
**File**: `app/components/adminviews/CronManagementView.tsx`

- Manual cron job triggering
- Real-time results display
- Invite success/failure tracking
- Meeting details visualization

## Key Improvements

### 1. Smart Meeting Management
- Admin-created meetings take priority over system defaults
- Automatic user list updates for existing meetings
- Seamless integration between manual and automated meeting creation

### 2. Enhanced User Experience
- Immediate invites for same-day registrations (currently commented but re-enabled)
- Unified messaging interface for future multi-platform support
- Better error handling and retry mechanisms

### 3. Improved Admin Control
- Visual calendar interface for meeting management
- Manual cron job triggering for testing
- Comprehensive result tracking and monitoring

## Environment Setup

Add these environment variables for full functionality:

```env
# Meeting Platform Configuration
DEFAULT_MEETING_PLATFORM=google-meet
DEFAULT_MEETING_TIME=21:00
DEFAULT_MEETING_DURATION=60

# Messaging Configuration  
ENABLE_EMAIL_MESSAGING=true
ENABLE_WHATSAPP_MESSAGING=false
FALLBACK_TO_EMAIL=true

# Cron Job Security
CRON_API_KEY=your-secure-cron-key

# Admin Access
ADMIN_PASSCODE=your-admin-passcode
```

## Workflow Examples

### Daily Admin Workflow
1. **Morning**: Check calendar and create meetings for upcoming dates
2. **Setup**: Enable "Auto-add active users" to prepare meetings for cron job
3. **Monitor**: Use Cron Jobs tab to manually trigger or monitor automated runs

### Automated Daily Process
1. **Cron Trigger**: Daily job runs (typically via Vercel Cron)
2. **Meeting Check**: System finds admin-created meeting OR creates default
3. **User Sync**: Adds any new active users to the meeting
4. **Invite Distribution**: Sends invites using messaging service
5. **Result Tracking**: Logs success/failure rates for monitoring

### Emergency Scenarios
1. **Manual Trigger**: Use admin dashboard to manually run cron job
2. **Missing Meetings**: System automatically creates defaults with environment settings
3. **Failed Invites**: Retry mechanisms and fallback messaging options

## Future Extensions

### WhatsApp Integration
- WhatsApp Business API setup
- Message templates for meeting invites
- Delivery confirmation tracking

### Advanced Features
- Meeting reminder system
- Custom meeting templates
- Multi-timezone support
- Integration with external calendar systems

## Testing

### Manual Testing
1. Use admin calendar to create meetings
2. Use "Trigger Cron Job Manually" button in admin dashboard
3. Check email delivery and meeting link generation

### Environment Testing
- Test with different `DEFAULT_MEETING_PLATFORM` values
- Verify fallback mechanisms when admin meetings are missing
- Test immediate invite functionality for same-day registrations
