# GOALETE Development Guide

## 🚀 Getting Started

This guide covers local development setup, coding standards, testing procedures, and contribution guidelines for the GOALETE meeting management system.

## 🏗️ Development Environment Setup

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **PostgreSQL 14+** (local or Docker)
- **Git** for version control
- **VS Code** (recommended) with extensions

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd goaletemeet

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Configure your environment variables

# Setup database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## 📁 Project Structure

```
goalete/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── admin/         # Admin endpoints
│   │   ├── cron-daily-invites/ # Cron jobs
│   │   └── createOrder/   # Order processing
│   ├── admin/             # Admin dashboard
│   ├── components/        # React components
│   └── globals.css        # Global styles
├── docs/                  # Documentation
├── lib/                   # Utility libraries
│   ├── admin.ts          # Admin utilities
│   ├── email.ts          # Email functionality
│   ├── meetingLink.ts    # Meeting management
│   └── prisma.ts         # Database client
├── prisma/               # Database schema & migrations
├── scripts/              # Utility scripts
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## 🛠️ Development Commands

### Essential Commands
```bash
# Development server
npm run dev                 # Start Next.js dev server

# Database operations
npx prisma studio          # Open database browser
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema changes
npx prisma migrate dev     # Create and apply migration

# Code quality
npm run lint               # Run ESLint
npm run lint:fix          # Fix linting issues
npm run type-check        # TypeScript type checking

# Testing
npm run test              # Run all tests
npm run test:security     # Security verification
npm run test:api          # API endpoint tests
```

### Build Commands
```bash
# Production build
npm run build             # Build for production
npm run start             # Start production server

# Development build
npm run build:dev         # Development build
npm run analyze           # Bundle analyzer
```

## 🧪 Testing Strategy

### Test Categories

#### 1. Unit Tests
```bash
# Component tests
npm run test:components

# Utility function tests
npm run test:utils

# Database function tests
npm run test:database
```

#### 2. Integration Tests
```bash
# API endpoint tests
npm run test:api

# Google Calendar integration
npm run test:google-calendar

# Email integration
npm run test:email
```

#### 3. Security Tests
```bash
# Meeting security verification
npm run test:security

# Cross-domain invite tests
npm run test:cross-domain

# Authentication tests
npm run test:auth
```

### Test File Structure
```
tests/
├── unit/
│   ├── components/
│   ├── lib/
│   └── utils/
├── integration/
│   ├── api/
│   ├── database/
│   └── external/
└── security/
    ├── meeting-security.test.ts
    └── cross-domain.test.ts
```

### Writing Tests
```typescript
// Example unit test
import { validateCrossDomainEmails } from '@/lib/meetingLink'

describe('validateCrossDomainEmails', () => {
  it('should validate email formats correctly', () => {
    const emails = ['user@gmail.com', 'test@company.co.uk']
    const result = validateCrossDomainEmails(emails)
    
    expect(result.isValid).toBe(true)
    expect(result.validEmails).toHaveLength(2)
  })
})

// Example integration test
import { POST } from '@/app/api/admin/meetings/route'

describe('/api/admin/meetings', () => {
  it('should create meeting with proper security settings', async () => {
    const request = new Request('http://localhost:3000/api/admin/meetings', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Meeting',
        date: '2024-02-01',
        time: '21:00'
      })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.meeting).toBeDefined()
    expect(data.security.isPrivate).toBe(true)
  })
})
```

## 📝 Coding Standards

### TypeScript Guidelines
```typescript
// Use strict typing
interface MeetingCreateRequest {
  title: string
  description?: string
  scheduledDate: Date
  duration: number
  attendeeEmails: string[]
}

// Prefer explicit return types for functions
async function createMeeting(
  request: MeetingCreateRequest
): Promise<{ meeting: Meeting; success: boolean }> {
  // Implementation
}

// Use enums for constants
enum MeetingStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

### React Component Guidelines
```typescript
// Use function components with TypeScript
interface AdminCalendarProps {
  meetings: Meeting[]
  onMeetingSelect: (meeting: Meeting) => void
  isLoading?: boolean
}

export function AdminCalendar({ 
  meetings, 
  onMeetingSelect, 
  isLoading = false 
}: AdminCalendarProps) {
  // Component implementation
}

// Use custom hooks for complex logic
function useMeetingManagement() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Hook logic
  
  return { meetings, isLoading, createMeeting, deleteMeeting }
}
```

### API Route Guidelines
```typescript
// Standard API route structure
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Input validation schema
const createMeetingSchema = z.object({
  title: z.string().min(1).max(100),
  date: z.string().datetime(),
  attendees: z.array(z.string().email())
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json()
    const validatedData = createMeetingSchema.parse(body)
    
    // Business logic
    const result = await createMeeting(validatedData)
    
    // Return response
    return NextResponse.json({ 
      success: true, 
      meeting: result 
    })
  } catch (error) {
    // Error handling
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 400 })
  }
}
```

## 🔧 Database Development

### Schema Changes
```bash
# 1. Modify prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_new_feature

# 3. Generate client
npx prisma generate

# 4. Test migration
npm run test:database
```

### Database Queries
```typescript
// Use Prisma client efficiently
import { prisma } from '@/lib/prisma'

// Good: Include related data in single query
const userWithMeetings = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    meetingAttendances: {
      include: {
        meeting: true
      }
    }
  }
})

// Good: Use transactions for multi-table operations
const result = await prisma.$transaction(async (tx) => {
  const meeting = await tx.meeting.create({ data: meetingData })
  const attendances = await tx.meetingAttendance.createMany({
    data: attendeeData
  })
  return { meeting, attendances }
})
```

### Database Testing
```typescript
// Use test database for integration tests
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "meetings" CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

## 🔐 Security Development

### Security Checklist
- [ ] Input validation on all API endpoints
- [ ] Authentication checks for protected routes
- [ ] SQL injection prevention (use Prisma)
- [ ] XSS prevention (sanitize user input)
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Error messages don't leak sensitive data

### Security Testing
```typescript
// Test authentication
describe('Authentication', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/admin/meetings')
    expect(response.status).toBe(401)
  })
})

// Test input validation
describe('Input Validation', () => {
  it('should reject invalid email formats', async () => {
    const response = await fetch('/api/admin/meetings', {
      method: 'POST',
      body: JSON.stringify({
        attendees: ['invalid-email']
      })
    })
    expect(response.status).toBe(400)
  })
})
```

## 🎨 UI Development

### Component Development
```typescript
// Use shadcn/ui components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Create reusable components
interface MeetingCardProps {
  meeting: Meeting
  onEdit: (meeting: Meeting) => void
  onDelete: (id: string) => void
}

export function MeetingCard({ meeting, onEdit, onDelete }: MeetingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{meeting.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Card content */}
      </CardContent>
    </Card>
  )
}
```

### Styling Guidelines
```css
/* Use Tailwind CSS utility classes */
.meeting-card {
  @apply bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow;
}

/* Create custom components for repeated patterns */
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
```

## 🚀 Performance Optimization

### Frontend Optimization
```typescript
// Use React.memo for expensive components
import { memo } from 'react'

export const MeetingList = memo(function MeetingList({ meetings }) {
  // Component implementation
})

// Use useMemo for expensive calculations
const filteredMeetings = useMemo(() => {
  return meetings.filter(meeting => meeting.status === 'scheduled')
}, [meetings])

// Use useCallback for stable function references
const handleMeetingSelect = useCallback((meeting: Meeting) => {
  onMeetingSelect(meeting)
}, [onMeetingSelect])
```

### Backend Optimization
```typescript
// Use database indexes for frequent queries
// Implement caching for expensive operations
import { cache } from 'react'

export const getActiveUsers = cache(async () => {
  return await prisma.user.findMany({
    where: { subscriptionStatus: 'active' }
  })
})

// Batch database operations
const attendances = await prisma.meetingAttendance.createMany({
  data: attendeeData,
  skipDuplicates: true
})
```

## 🔍 Debugging

### Development Tools
```bash
# Enable debug logging
DEBUG=true npm run dev

# Database debugging
npx prisma studio

# API debugging
curl -X POST http://localhost:3000/api/admin/meetings \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Meeting"}'
```

### Logging
```typescript
// Use structured logging
import { logger } from '@/lib/logger'

logger.info('Meeting created', {
  meetingId: meeting.id,
  attendeeCount: attendees.length,
  userId: user.id
})

logger.error('Failed to create meeting', {
  error: error.message,
  userId: user.id,
  requestData: sanitizedData
})
```

## 📦 Deployment Preparation

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build succeeds without errors
- [ ] Security scan completed
- [ ] Performance tests passed

### Build Process
```bash
# Production build
npm run build

# Test production build locally
npm run start

# Analyze bundle size
npm run analyze
```

## 🤝 Contributing

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/meeting-reminders

# Make changes and commit
git add .
git commit -m "feat: add meeting reminder functionality"

# Push and create PR
git push origin feature/meeting-reminders
```

### Commit Messages
```bash
# Use conventional commits
feat: add cross-domain email validation
fix: resolve meeting creation timezone issue
docs: update API documentation
test: add security verification tests
refactor: improve meeting query performance
```

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation if needed
4. Run all tests locally
5. Create pull request with description
6. Address review comments
7. Merge after approval

## 📚 Additional Resources

### Documentation
- [Installation Guide](./installation-guide.md)
- [API Documentation](./api-documentation.md)
- [Security Implementation](./security-implementation-summary.md)
- [Database Schema](./database-schema.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google Calendar API](https://developers.google.com/calendar)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools and Extensions
- [Prisma Studio](https://www.prisma.io/studio)
- [Next.js DevTools](https://nextjs.org/docs/advanced-features/debugging)
- [React Developer Tools](https://reactjs.org/blog/2015/09/02/new-react-developer-tools.html)

---

**Happy Development! 🚀**

For questions or issues, check the [FAQ](./faq.md) or create an issue in the repository.
