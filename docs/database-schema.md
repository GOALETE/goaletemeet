# Database Schema Documentation

## 📊 Overview

GOALETE uses PostgreSQL with Prisma ORM for database management. The schema is designed to support secure meeting management, subscription tracking, and comprehensive user management with family plan support.

## 🗃️ Database Schema

### Core Tables

#### 1. User Table
```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  firstName         String?
  lastName          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  isActive          Boolean  @default(true)
  isAdmin           Boolean  @default(false)
  
  // Subscription Management
  subscriptionStatus String?  // 'active', 'inactive', 'pending'
  subscriptionType   String?  // 'individual', 'family'
  subscriptionExpiry DateTime?
  
  // Family Plan Support
  familyPlanId      String?
  familyRole        String?  // 'primary', 'member'
  
  // Meeting Preferences
  timezone          String   @default("UTC")
  preferredMeetingTime String? @default("21:00")
  
  // Tracking
  lastLoginAt       DateTime?
  emailVerified     Boolean  @default(false)
  
  // Relations
  familyPlan        FamilyPlan? @relation(fields: [familyPlanId], references: [id])
  meetingAttendances MeetingAttendance[]
  orders            Order[]
  
  @@map("users")
}
```

#### 2. FamilyPlan Table
```prisma
model FamilyPlan {
  id              String   @id @default(cuid())
  primaryUserId   String   @unique
  planName        String?
  maxMembers      Int      @default(6)
  currentMembers  Int      @default(1)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Subscription Details
  subscriptionExpiry DateTime?
  billingCycle       String?  // 'monthly', 'yearly'
  
  // Relations
  members         User[]
  
  @@map("family_plans")
}
```

#### 3. Meeting Table
```prisma
model Meeting {
  id                String   @id @default(cuid())
  title             String
  description       String?
  
  // Meeting Details
  scheduledDate     DateTime
  startTime         String   // "21:00"
  duration          Int      @default(60) // minutes
  timezone          String   @default("UTC")
  
  // Platform Details
  platform          String   @default("google-meet") // 'google-meet', 'zoom'
  meetingLink       String?
  meetingId         String?  // Google Calendar Event ID
  
  // Security & Access
  isPrivate         Boolean  @default(true)
  maxAttendees      Int?     @default(50)
  requiresApproval  Boolean  @default(false)
  
  // Status
  status            String   @default("scheduled") // 'scheduled', 'active', 'completed', 'cancelled'
  isRecurring       Boolean  @default(false)
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String?  // Admin user ID
  
  // Analytics
  attendeeCount     Int      @default(0)
  actualDuration    Int?     // Actual meeting duration
  
  // Relations
  attendances       MeetingAttendance[]
  
  @@map("meetings")
}
```

#### 4. MeetingAttendance Table
```prisma
model MeetingAttendance {
  id              String   @id @default(cuid())
  
  // References
  meetingId       String
  userId          String
  
  // Attendance Details
  status          String   @default("invited") // 'invited', 'accepted', 'declined', 'attended', 'no_show'
  invitedAt       DateTime @default(now())
  respondedAt     DateTime?
  joinedAt        DateTime?
  leftAt          DateTime?
  
  // Cross-Domain Support
  emailDomain     String?  // Extracted from user email
  isExternalDomain Boolean @default(false)
  
  // Analytics
  joinDuration    Int?     // Time spent in meeting (minutes)
  deviceType      String?  // 'desktop', 'mobile', 'tablet'
  
  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  meeting         Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([meetingId, userId])
  @@map("meeting_attendances")
}
```

#### 5. Order Table
```prisma
model Order {
  id              String   @id @default(cuid())
  
  // User Reference
  userId          String
  
  // Order Details
  orderNumber     String   @unique
  status          String   @default("pending") // 'pending', 'completed', 'failed', 'refunded'
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("USD")
  
  // Subscription Details
  subscriptionType String  // 'individual', 'family'
  billingCycle     String  // 'monthly', 'yearly'
  
  // Payment Information
  paymentMethod    String?
  paymentProvider  String? // 'stripe', 'paypal', etc.
  transactionId    String?
  
  // Timestamps
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  completedAt      DateTime?
  
  // Relations
  user            User     @relation(fields: [userId], references: [id])
  
  @@map("orders")
}
```

#### 6. SystemLog Table
```prisma
model SystemLog {
  id          String   @id @default(cuid())
  
  // Log Details
  level       String   // 'info', 'warn', 'error', 'debug'
  message     String
  category    String   // 'meeting', 'user', 'security', 'cron', 'api'
  
  // Context
  userId      String?
  meetingId   String?
  operation   String?  // 'create_meeting', 'invite_user', 'cron_job', etc.
  
  // Request Information
  ipAddress   String?
  userAgent   String?
  requestId   String?
  
  // Data
  metadata    Json?    // Additional structured data
  
  // Timestamp
  timestamp   DateTime @default(now())
  
  @@map("system_logs")
}
```

## 🔍 Indexes and Performance

### Primary Indexes
```sql
-- User email lookup (most frequent)
CREATE INDEX idx_users_email ON users(email);

-- Active subscription lookup
CREATE INDEX idx_users_subscription ON users(subscription_status, subscription_expiry);

-- Meeting date range queries
CREATE INDEX idx_meetings_date ON meetings(scheduled_date, status);

-- Meeting attendance lookups
CREATE INDEX idx_attendance_meeting_user ON meeting_attendances(meeting_id, user_id);

-- System log queries
CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX idx_system_logs_category ON system_logs(category, level);
```

### Composite Indexes
```sql
-- Family plan member lookup
CREATE INDEX idx_users_family_plan ON users(family_plan_id, family_role);

-- Active meetings with attendance
CREATE INDEX idx_meetings_active ON meetings(status, scheduled_date) WHERE status = 'scheduled';

-- Cross-domain analytics
CREATE INDEX idx_attendance_domain ON meeting_attendances(is_external_domain, email_domain);
```

## 📈 Analytics Views

### Meeting Statistics View
```sql
CREATE VIEW meeting_statistics AS
SELECT 
  m.id,
  m.title,
  m.scheduled_date,
  m.status,
  COUNT(ma.id) as invited_count,
  COUNT(CASE WHEN ma.status = 'attended' THEN 1 END) as attended_count,
  COUNT(CASE WHEN ma.is_external_domain = true THEN 1 END) as external_attendees,
  AVG(ma.join_duration) as avg_duration
FROM meetings m
LEFT JOIN meeting_attendances ma ON m.id = ma.meeting_id
GROUP BY m.id, m.title, m.scheduled_date, m.status;
```

### User Engagement View
```sql
CREATE VIEW user_engagement AS
SELECT 
  u.id,
  u.email,
  u.subscription_status,
  COUNT(ma.id) as meetings_invited,
  COUNT(CASE WHEN ma.status = 'attended' THEN 1 END) as meetings_attended,
  AVG(ma.join_duration) as avg_meeting_duration,
  MAX(ma.joined_at) as last_meeting_attended
FROM users u
LEFT JOIN meeting_attendances ma ON u.id = ma.user_id
GROUP BY u.id, u.email, u.subscription_status;
```

## 🔒 Security Constraints

### Data Integrity
```sql
-- Ensure subscription expiry is in the future for active subscriptions
ALTER TABLE users ADD CONSTRAINT check_active_subscription 
CHECK (
  (subscription_status != 'active') OR 
  (subscription_expiry IS NULL) OR 
  (subscription_expiry > NOW())
);

-- Family plan member limits
ALTER TABLE family_plans ADD CONSTRAINT check_member_limits
CHECK (current_members <= max_members AND current_members >= 0);

-- Meeting duration constraints
ALTER TABLE meetings ADD CONSTRAINT check_meeting_duration
CHECK (duration > 0 AND duration <= 480); -- Max 8 hours

-- Order amount validation
ALTER TABLE orders ADD CONSTRAINT check_order_amount
CHECK (amount > 0);
```

### Row Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_self_access ON users
FOR ALL USING (auth.uid() = id);

-- Family plan members can see plan details
CREATE POLICY family_plan_member_access ON family_plans
FOR SELECT USING (
  id IN (
    SELECT family_plan_id FROM users WHERE id = auth.uid()
  )
);
```

## 🔧 Database Maintenance

### Regular Maintenance Tasks

#### 1. Statistics Update
```sql
-- Update table statistics (weekly)
ANALYZE users;
ANALYZE meetings;
ANALYZE meeting_attendances;
ANALYZE orders;
```

#### 2. Cleanup Old Logs
```sql
-- Clean up logs older than 90 days
DELETE FROM system_logs 
WHERE timestamp < NOW() - INTERVAL '90 days'
AND level != 'error'; -- Keep error logs longer
```

#### 3. Archive Completed Meetings
```sql
-- Archive meetings older than 1 year
UPDATE meetings 
SET status = 'archived'
WHERE scheduled_date < NOW() - INTERVAL '1 year'
AND status = 'completed';
```

### Backup Strategy
```bash
# Daily backup script
pg_dump -h localhost -U goalete_user goalete > backup_$(date +%Y%m%d).sql

# Weekly full backup with compression
pg_dump -h localhost -U goalete_user -Fc goalete > weekly_backup_$(date +%Y%m%d).backup
```

## 🚀 Migrations

### Migration Files Location
```
prisma/migrations/
├── 20240101000000_initial_schema/
├── 20240115000000_add_family_plans/
├── 20240201000000_meeting_security_enhancements/
└── migration_lock.toml
```

### Common Migration Commands
```bash
# Create new migration
npx prisma migrate dev --name add_feature_name

# Deploy to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

## 📊 Performance Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   - Average query execution time
   - Slow query identification
   - Index usage statistics

2. **Database Size**
   - Table growth rates
   - Index size monitoring
   - Storage usage trends

3. **Connection Pool**
   - Active connections
   - Connection wait times
   - Pool exhaustion events

### Monitoring Queries
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Database size information
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔄 Version History

### Schema Versions

- **v1.0** (Initial) - Basic user and meeting management
- **v1.1** - Added family plan support
- **v1.2** - Enhanced security and cross-domain features
- **v1.3** - Added comprehensive analytics and logging
- **v2.0** - Current version with full meeting management system

### Upgrade Path
When upgrading between versions, always:
1. Backup the database
2. Test migrations on staging environment
3. Run migrations during low-traffic periods
4. Verify data integrity post-migration

---

**Related Documentation:**
- [Installation Guide](./installation-guide.md)
- [API Documentation](./api-documentation.md)
- [Security Implementation](./security-implementation-summary.md)
