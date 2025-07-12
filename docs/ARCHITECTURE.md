# GoaleteMeet - Architecture Overview

## System Architecture

### Technology Stack
- **Frontend**: Next.js 15.3.3 with React
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Admin passcode-based system
- **Email**: Nodemailer with Gmail SMTP
- **Payments**: Razorpay integration
- **Calendar**: Google Calendar API
- **Meetings**: Google Meet integration
- **Styling**: Tailwind CSS

### Core Components

#### 1. User Registration System
```
Registration Form → Payment Processing → Database Storage → Email Confirmation
```

**Flow**:
1. User selects plan and fills registration form
2. Razorpay payment gateway processes payment
3. Webhook confirms payment and creates subscription
4. Email service sends confirmation and calendar invite
5. User receives meeting access details

#### 2. Admin Dashboard System
```
Admin Authentication → Data Fetching → View Components → Actions/Exports
```

**Architecture**:
- React-based dashboard with multiple view components
- API routes handle data operations with authentication
- Real-time filtering and search capabilities
- Export functionality for data management

#### 3. Meeting Management System
```
Cron Scheduler → Meeting Creation → Invite Distribution → Attendance Tracking
```

**Process**:
- Daily cron jobs create meetings for active subscriptions
- Google Calendar API handles meeting scheduling
- Email system distributes meeting invitations
- Admin dashboard tracks attendance and participation

### Database Schema

#### Core Models

**User Model**:
```prisma
model User {
  id            String         @id @default(cuid())
  firstName     String
  lastName      String
  email         String         @unique
  phone         String?
  source        String?
  role          String?        @default("user")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]
  
  @@map("users")
}
```

**Subscription Model**:
```prisma
model Subscription {
  id            String   @id @default(cuid())
  userId        String
  planType      String
  startDate     DateTime
  endDate       DateTime
  status        String   @default("active")
  paymentStatus String   @default("pending")
  duration      Int?
  price         Float?
  orderId       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("subscriptions")
}
```

**Meeting Model**:
```prisma
model Meeting {
  id           String   @id @default(cuid())
  meetingDate  DateTime
  platform     String   @default("google-meet")
  meetingLink  String?
  startTime    String
  endTime      String
  startTimeIST String?
  endTimeIST   String?
  createdBy    String?
  isDefault    Boolean  @default(false)
  meetingDesc  String?
  meetingTitle String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@map("meetings")
}
```

### Key Architectural Decisions

#### 1. Subscription-Centric Data Display
**Problem**: Users with multiple subscriptions were only showing their most recent subscription in admin views.

**Solution**: 
- Modified API endpoints to return individual subscription records
- Updated admin components to display each subscription as a separate entry
- Maintained user relationship data within subscription records

**Implementation**:
```typescript
// Before: User-centric with aggregated subscription
{
  id: "user123",
  name: "John Doe",
  subscription: { /* only most recent */ }
}

// After: Subscription-centric with user details
{
  id: "sub123",
  planType: "monthly",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  userName: "John Doe",
  userEmail: "john@example.com",
  userId: "user123"
}
```

#### 2. Authentication Strategy
- Admin passcode stored in environment variables
- Session-based storage for dashboard access
- API route protection with Bearer token authentication

#### 3. Data Relationships
- One-to-Many: User → Subscriptions
- Cascade deletion: User deletion removes associated subscriptions
- Independent tracking: Each subscription maintains separate payment/date records

### API Architecture

#### Authentication Pattern
```typescript
// Standard admin API authentication
const authHeader = req.headers.get("authorization");
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

const token = authHeader.split(" ")[1];
if (token !== process.env.ADMIN_PASSCODE) {
  return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
}
```

#### Data Fetching Pattern
```typescript
// Subscription-centric data fetching
const subscriptions = await prisma.subscription.findMany({
  where: filterConditions,
  include: {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    }
  },
  orderBy: { startDate: 'desc' }
});

// Transform for frontend consumption
const formattedSubscriptions = subscriptions.map(sub => ({
  id: sub.id,
  planType: sub.planType,
  startDate: sub.startDate,
  endDate: sub.endDate,
  status: sub.status,
  price: sub.price,
  orderId: sub.orderId,
  userId: sub.user.id,
  userName: `${sub.user.firstName} ${sub.user.lastName}`,
  userEmail: sub.user.email,
  userPhone: sub.user.phone
}));
```

### Email & Calendar Integration

#### Email Service
- **Provider**: Gmail SMTP via Nodemailer
- **Templates**: HTML templates for confirmations and invites
- **Scheduling**: Cron-based automated sending
- **Tracking**: Delivery status and error handling

#### Google Calendar Integration
- **Service Account**: Domain-wide delegation for calendar access
- **Meeting Creation**: Automated Google Meet link generation
- **Invitation Management**: Bulk invitation sending
- **Time Zone Handling**: IST conversion and display

### Performance Considerations

#### Database Optimization
- Indexed fields: email (unique), userId (foreign key)
- Pagination for large datasets
- Efficient joins with selected fields only
- Cascade relationships for data integrity

#### Frontend Optimization
- Component-based architecture for reusability
- Efficient state management with React hooks
- Filtered data processing on client side
- Lazy loading for large user lists

#### API Optimization
- Query parameter-based filtering
- Response size optimization through field selection
- Error handling and status codes
- Request validation and sanitization

### Security Implementation

#### Data Protection
- Environment variable storage for sensitive data
- API authentication on all admin routes
- Input validation and sanitization
- CORS configuration for API access

#### Payment Security
- Razorpay webhook verification
- Order ID validation
- Payment status confirmation
- Secure credential handling

### Deployment Architecture

#### Environment Configuration
- Production: Vercel hosting
- Database: PostgreSQL (managed service)
- Email: Gmail SMTP with app passwords
- Storage: Environment variables for all secrets

#### Scaling Considerations
- Stateless API design for horizontal scaling
- Database connection pooling
- Efficient cron job scheduling
- Optimized bundle sizes for faster loading

### Monitoring & Maintenance

#### Error Handling
- Comprehensive try-catch blocks
- Structured error responses
- Logging for debugging
- Graceful fallbacks for service failures

#### Data Backup
- Automated database backups
- Export functionality for manual backups
- Data integrity checks
- Recovery procedures documented

### Future Architecture Considerations

#### Scalability
- Microservices architecture for large scale
- Redis caching for frequently accessed data
- CDN integration for static assets
- Load balancing for high traffic

#### Feature Extensions
- Real-time notifications with WebSockets
- Advanced analytics with time-series data
- Multi-tenant architecture for multiple organizations
- Mobile app API integration
