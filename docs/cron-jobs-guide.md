# Cron Job Management Guide

## 🕐 Overview

GOALETE includes a sophisticated cron job system for automated meeting management and email notifications. This system is designed with fine-grained control via environment variables, allowing administrators to enable or disable specific features based on their needs.

## 🎛️ Environment Variable Controls

### Master Control
```bash
# Enable/disable all cron job execution
ENABLE_CRON_JOBS="true"     # Default: true
# When set to "false", all cron jobs are completely disabled
```

### Basic Configuration
```bash
# Enable or disable cron jobs
ENABLE_CRON_JOBS="true"     # Default: true
```

## 🔧 Configuration Examples

### Development Environment
```bash
# Disable all cron jobs
ENABLE_CRON_JOBS="false"

# Enable cron jobs  
ENABLE_CRON_JOBS="true"
```

### Maintenance Mode
```bash
# Temporarily disable cron jobs during maintenance
ENABLE_CRON_JOBS="false"
```

## 📡 API Endpoints

### Cron Status Endpoint
```bash
GET /api/cron-status
```

**Response:**
```json
{
  "success": true,
  "message": "All cron job features are enabled",
  "status": {
    "enabled": true,
    "features": {
      "meetingCreation": true,
      "emailNotifications": true
    },
    "source": "environment",
    "timestamp": "2024-01-20T12:00:00.000Z"
  },
  "endpoints": {
    "dailyInvites": "/api/cron-daily-invites",
    "status": "/api/cron-status"
  }
}
```

### Daily Invites Cron Job
```bash
GET /api/cron-daily-invites
```

**With API Key:**
```bash
GET /api/cron-daily-invites?apiKey=your-api-key
```

**Response with Feature Flags:**
```json
{
  "success": true,
  "message": "Sent 15 invites successfully, 0 failed",
  "featureFlags": {
    "autoMeetingCreation": true,
    "autoEmailNotifications": true
  },
  "metrics": {
    "duration": 2500,
    "successRate": 100,
    "skippedOperations": []
  },
  "meetingDetails": {
    "id": "meeting-123",
    "date": "2024-01-20",
    "platform": "google-meet",
    "title": "GOALETE Club Daily Session"
  }
}
```

## 🧪 Testing Cron Job Configuration

### Test Script
```bash
# Test all cron job feature flag combinations
node scripts/test-cron-feature-flags.js
```

### Manual Testing
```bash
# Check cron job status
curl http://localhost:3000/api/cron-status

# Test with API key
curl "http://localhost:3000/api/cron-status?apiKey=your-api-key"

# Test cron job execution (be careful in production)
curl http://localhost:3000/api/cron-daily-invites
```

### Test Cases
1. **All features enabled** - Normal operation
2. **Cron jobs disabled** - Should return disabled status
3. **Meeting creation disabled** - Should skip meeting operations
4. **Email notifications disabled** - Should skip email sending
5. **Both features disabled** - Should run but skip all operations

## 🔄 Cron Job Behavior Matrix

| ENABLE_CRON_JOBS | Behavior |
|------------------|----------|
| `false` | All cron jobs disabled |
| `true` | Full functionality enabled |

## 🔐 Security Considerations

### Access Control
- Cron endpoints should only be accessible from trusted sources
- Use firewall rules to restrict access if possible
- Monitor cron job execution logs for unauthorized attempts

### Logging
All cron job operations are logged with:
- Execution timestamp
- Feature flag status
- Operation results
- Error details
- Performance metrics

## 📊 Monitoring and Analytics

### Health Checks
```bash
# Check if cron jobs are configured properly
curl /api/cron-status

# Verify feature flags are set correctly
node -e "console.log(require('./lib/cronConfig').getCronJobStatus())"
```

### Metrics to Monitor
- Cron job execution frequency
- Success/failure rates
- Email delivery rates
- Meeting creation statistics
- Feature flag usage patterns

### Alerts to Configure
- Cron job failures
- Unexpected feature flag changes
- Email delivery failures
- Meeting creation errors

## 🚨 Troubleshooting

### Common Issues

#### Cron Jobs Not Running
1. Check `ENABLE_CRON_JOBS` setting
2. Verify cron job is scheduled in platform (Vercel, etc.)
3. Check API key configuration
4. Review application logs

#### Meetings Not Created
1. Verify `ENABLE_AUTO_MEETING_CREATION="true"`
2. Check Google Calendar API credentials
3. Review meeting creation logs
4. Test manual meeting creation

#### Emails Not Sent
1. Verify `ENABLE_CRON_JOBS="true"`
2. Check email service configuration
3. Review email sending logs
4. Test manual email sending

#### API Key Issues
```bash
# Test without API key
curl /api/cron-status

# Test cron status
curl /api/cron-status
```

### Debug Commands
```bash
# Get current configuration
node -e "console.log(require('./lib/cronConfig').getCronJobConfig())"

# Test feature flags
node scripts/test-cron-feature-flags.js

# Check environment variables
env | grep ENABLE_
```

## 🔄 Migration Guide

### From Previous Versions
If upgrading from a version without cron job controls:

1. **Add new environment variables:**
   ```bash
   ENABLE_CRON_JOBS="true"
   ENABLE_AUTO_MEETING_CREATION="true"
   ENABLE_CRON_JOBS="true"
   ```

2. **Test configuration:**
   ```bash
   npm run test:cron-feature-flags
   ```

3. **Deploy with new settings:**
   - Test cron functionality

### Environment Variable Migration
```bash
# Old way (granular control)
# ENABLE_AUTO_MEETING_CREATION and ENABLE_AUTO_EMAIL_NOTIFICATIONS

# New way (simplified)
ENABLE_CRON_JOBS="true"                    # Master control for all cron functionality
CRON_API_KEY="secure-api-key"             # Security
```

## 📚 Related Documentation

- [Environment Configuration](./environment-configuration.md) - Complete environment variable guide
- [API Documentation](./api-documentation.md) - All API endpoints
- [Deployment Guide](./deployment-guide.md) - Production deployment
- [Security Implementation](./security-implementation-summary.md) - Security features

---

**Best Practices:**
- Always test cron job configuration changes before deployment
- Monitor cron job execution and success rates
- Document any custom cron job schedules
