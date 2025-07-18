# Google Calendar Notification Settings

## Issue Description
Google Calendar API automatically sends email notifications to the organizer (admin) for various events:

1. **Meeting Creation**: When new meetings are created
2. **User Additions**: When attendees are added to meetings
3. **Meeting Changes**: When users modify or delete meetings from their calendars
4. **Reminder Notifications**: Email reminders before meeting start times

This causes **inbox flooding** for the admin email address.

## Solution Implemented

### 1. Environment Variable Control
Added new environment variable `DISABLE_ORGANIZER_NOTIFICATIONS` to control notification behavior:

```bash
# Disable organizer notifications (default: true - notifications disabled)
DISABLE_ORGANIZER_NOTIFICATIONS=true

# Enable organizer notifications (set to false to receive notifications)
# DISABLE_ORGANIZER_NOTIFICATIONS=false
```

### 2. Code Changes Made

#### New Helper Functions
- `shouldDisableOrganizerNotifications()`: Returns true if organizer notifications should be disabled
- `getSendUpdatesMode()`: Returns appropriate sendUpdates mode for Google Calendar API

#### Modified API Calls
All Google Calendar API calls now use:
- `sendUpdates: getSendUpdatesMode()` - Controls who gets notifications
- `sendNotifications: !shouldDisableOrganizerNotifications()` - Controls organizer notifications
- Conditional reminders configuration

### 3. Notification Modes

#### When DISABLE_ORGANIZER_NOTIFICATIONS=true (default)
- `sendUpdates: 'none'` - No email notifications sent to anyone
- `sendNotifications: false` - Organizer (admin) gets no notifications
- `reminders: [{ method: 'popup', minutes: 15 }]` - Only popup reminder in admin calendar

#### When DISABLE_ORGANIZER_NOTIFICATIONS=false
- `sendUpdates: 'externalOnly'` - Notifications sent to external domain attendees only
- `sendNotifications: true` - Organizer (admin) receives notifications
- `reminders: [{ method: 'email', minutes: 60/15 }]` - Email reminders enabled

## Implementation Details

### Files Modified
- `lib/meetingLink.ts`: Updated all Google Calendar API calls
  - `google_create_meet()`: Meeting creation
  - `google_add_user_to_meeting()`: Single user addition
  - `google_add_users_to_meeting()`: Batch user addition

### API Parameters Used
- `sendUpdates`: Controls notification emails to attendees
- `sendNotifications`: Controls notification emails to organizer
- `reminders.overrides`: Controls reminder notifications

## User Experience Impact

### For Admin (Organizer)
- **Before**: Inbox flooded with meeting notifications
- **After**: No email notifications (default), only calendar popup reminders

### For Meeting Attendees
- **Before**: Received email invitations and updates
- **After**: Still receive meeting invitations through the application's email system
- Calendar integration still works normally

### Meeting Functionality
- ✅ Meeting creation works normally
- ✅ Users can still join meetings
- ✅ Calendar invites still sent through application email system
- ✅ Google Meet links generated properly
- ✅ Cross-domain support maintained

## Configuration Options

### Option 1: Complete Silence (Recommended - Default)
```bash
DISABLE_ORGANIZER_NOTIFICATIONS=true
# or leave unset (defaults to true)
```
- No email notifications to admin
- Users get invites through application email system only

### Option 2: Minimal Notifications
```bash
DISABLE_ORGANIZER_NOTIFICATIONS=false
```
- Admin receives some notifications
- External domain users get Google Calendar notifications

### Option 3: Custom Configuration
Modify the helper functions in `lib/meetingLink.ts` for specific notification rules.

## Testing the Solution

### 1. Create Test Meeting
```bash
# Test meeting creation with notifications disabled
curl -X POST http://localhost:3000/api/admin/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "dates": ["2024-01-15"],
    "platform": "google-meet",
    "startTime": "21:00",
    "duration": 60
  }'
```

### 2. Add Test User
```bash
# Test user addition with notifications disabled
curl -X POST http://localhost:3000/api/admin/add-user-to-meeting \
  -H "Content-Type: application/json" \
  -d '{
    "action": "addUserToMeeting",
    "userId": "test-user-id",
    "date": "2024-01-15"
  }'
```

### 3. Verify Results
- Check admin email inbox (should be empty)
- Check Google Calendar (meeting should exist with popup reminder only)
- Verify meeting functionality works normally

## Rollback Instructions

If you need to restore the original notification behavior:

```bash
# Enable all notifications (original behavior)
DISABLE_ORGANIZER_NOTIFICATIONS=false
```

Or remove the environment variable entirely and update the code to use the original hardcoded values.

## Additional Notes

- Users will continue to receive meeting invitations through the application's email system (`lib/email.ts`)
- Google Calendar integration remains fully functional
- Cross-domain email support is maintained
- No impact on meeting join functionality
- Admin can still see all meetings in Google Calendar with popup reminders

This solution provides a clean way to stop the notification flooding while maintaining all essential functionality.
