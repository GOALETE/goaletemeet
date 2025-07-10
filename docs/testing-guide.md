# GOALETE Testing Guide

## 🧪 Overview

This comprehensive testing guide covers all aspects of testing the GOALETE meeting management system, from unit tests to security verification, ensuring robust and reliable functionality.

## 🏗️ Testing Architecture

### Test Categories
1. **Unit Tests** - Individual functions and components
2. **Integration Tests** - API endpoints and database operations
3. **Security Tests** - Meeting security and cross-domain functionality
4. **End-to-End Tests** - Complete user workflows
5. **Performance Tests** - Load and stress testing

### Testing Stack
- **Jest** - JavaScript testing framework
- **React Testing Library** - Component testing
- **Supertest** - API endpoint testing
- **Playwright** - End-to-end testing
- **Custom Scripts** - Security and integration verification

## 📁 Test Structure

```
tests/
├── unit/                   # Unit tests
│   ├── components/         # React component tests
│   ├── lib/               # Library function tests
│   └── utils/             # Utility function tests
├── integration/           # Integration tests
│   ├── api/               # API endpoint tests
│   ├── database/          # Database operation tests
│   └── external/          # External service tests
├── security/              # Security verification tests
│   ├── meeting-security.test.ts
│   ├── cross-domain.test.ts
│   └── auth.test.ts
├── e2e/                   # End-to-end tests
│   ├── admin-dashboard.spec.ts
│   ├── meeting-creation.spec.ts
│   └── user-workflows.spec.ts
└── performance/           # Performance tests
    ├── load-testing.ts
    └── stress-testing.ts
```

## 🚀 Quick Start

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:security
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Scripts Overview
```bash
# Security verification
npm run test:security              # Complete security test suite
npm run test:meeting-security      # Meeting security features
npm run test:cross-domain         # Cross-domain invite functionality

# Functionality tests
npm run test:api                  # API endpoint testing
npm run test:database            # Database operations
npm run test:google-calendar     # Google Calendar integration
npm run test:email               # Email functionality

# Performance tests
npm run test:performance         # Performance benchmarks
npm run test:load               # Load testing
```

## 🔧 Unit Testing

### Component Testing
```typescript
// tests/unit/components/AdminCalendar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AdminCalendar } from '@/app/components/AdminCalendar'

describe('AdminCalendar', () => {
  const mockMeetings = [
    {
      id: '1',
      title: 'Test Meeting',
      scheduledDate: new Date('2024-02-01T21:00:00Z'),
      status: 'scheduled'
    }
  ]

  it('renders meetings correctly', () => {
    render(
      <AdminCalendar 
        meetings={mockMeetings} 
        onMeetingSelect={jest.fn()} 
      />
    )
    
    expect(screen.getByText('Test Meeting')).toBeInTheDocument()
  })

  it('calls onMeetingSelect when meeting is clicked', () => {
    const mockOnSelect = jest.fn()
    render(
      <AdminCalendar 
        meetings={mockMeetings} 
        onMeetingSelect={mockOnSelect} 
      />
    )
    
    fireEvent.click(screen.getByText('Test Meeting'))
    expect(mockOnSelect).toHaveBeenCalledWith(mockMeetings[0])
  })

  it('shows loading state correctly', () => {
    render(
      <AdminCalendar 
        meetings={[]} 
        onMeetingSelect={jest.fn()} 
        isLoading={true}
      />
    )
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
```

### Library Function Testing
```typescript
// tests/unit/lib/meetingLink.test.ts
import { 
  validateCrossDomainEmails, 
  google_create_meet,
  enhanceMeetingSecurity 
} from '@/lib/meetingLink'

describe('validateCrossDomainEmails', () => {
  it('validates mixed email domains correctly', () => {
    const emails = [
      'user@gmail.com',
      'test@company.co.uk',
      'admin@university.edu',
      'invalid-email'
    ]
    
    const result = validateCrossDomainEmails(emails)
    
    expect(result.isValid).toBe(false)
    expect(result.validEmails).toHaveLength(3)
    expect(result.invalidEmails).toContain('invalid-email')
    expect(result.domainStats.gmail).toBe(1)
    expect(result.domainStats.corporate).toBe(2)
  })

  it('handles empty email list', () => {
    const result = validateCrossDomainEmails([])
    
    expect(result.isValid).toBe(true)
    expect(result.validEmails).toHaveLength(0)
    expect(result.totalEmails).toBe(0)
  })
})

describe('google_create_meet', () => {
  beforeEach(() => {
    // Mock Google Calendar API
    jest.clearAllMocks()
  })

  it('creates meeting with security settings', async () => {
    const meetingData = {
      title: 'Test Meeting',
      description: 'Test Description',
      start: new Date('2024-02-01T21:00:00Z'),
      duration: 60
    }

    const result = await google_create_meet(meetingData)

    expect(result.success).toBe(true)
    expect(result.meetingData.visibility).toBe('private')
    expect(result.meetingData.guestsCanInviteOthers).toBe(false)
    expect(result.meetingData.extendedProperties.private.securityLevel).toBe('invite-only')
  })
})
```

## 🔗 Integration Testing

### API Endpoint Testing
```typescript
// tests/integration/api/admin-meetings.test.ts
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/admin/meetings/route'

describe('/api/admin/meetings', () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase()
  })

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestDatabase()
  })

  describe('POST /api/admin/meetings', () => {
    it('creates meeting with valid data', async () => {
      const requestData = {
        title: 'Integration Test Meeting',
        description: 'Test meeting creation',
        date: '2024-02-01',
        time: '21:00',
        duration: 60,
        attendees: ['user1@gmail.com', 'user2@company.com']
      }

      const request = new NextRequest('http://localhost:3000/api/admin/meetings', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.meeting.title).toBe(requestData.title)
      expect(data.security.isPrivate).toBe(true)
      expect(data.crossDomain.totalDomains).toBe(2)
    })

    it('rejects invalid meeting data', async () => {
      const invalidData = {
        title: '', // Empty title
        date: 'invalid-date',
        attendees: ['invalid-email']
      }

      const request = new NextRequest('http://localhost:3000/api/admin/meetings', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/admin/meetings', () => {
    it('returns meetings list for admin', async () => {
      // Create test meetings
      await createTestMeetings(3)

      const request = new NextRequest('http://localhost:3000/api/admin/meetings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.meetings).toHaveLength(3)
      expect(data.meetings[0]).toHaveProperty('id')
      expect(data.meetings[0]).toHaveProperty('title')
    })
  })
})
```

### Database Integration Testing
```typescript
// tests/integration/database/meeting-operations.test.ts
import { prisma } from '@/lib/prisma'
import { createMeetingWithAttendees, addUserToMeeting } from '@/lib/meetingLink'

describe('Meeting Database Operations', () => {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "meetings" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "meeting_attendances" CASCADE`
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('creates meeting with attendees atomically', async () => {
    // Create test users
    const users = await createTestUsers(3)
    
    const meetingData = {
      title: 'Database Test Meeting',
      scheduledDate: new Date('2024-02-01T21:00:00Z'),
      duration: 60,
      attendeeIds: users.map(u => u.id)
    }

    const result = await createMeetingWithAttendees(meetingData)

    expect(result.success).toBe(true)
    
    // Verify meeting was created
    const meeting = await prisma.meeting.findUnique({
      where: { id: result.meeting.id },
      include: { attendances: true }
    })

    expect(meeting).toBeTruthy()
    expect(meeting.attendances).toHaveLength(3)
  })

  it('handles duplicate attendee addition gracefully', async () => {
    const meeting = await createTestMeeting()
    const user = await createTestUser()

    // Add user first time
    const result1 = await addUserToMeeting(meeting.id, user.id)
    expect(result1.success).toBe(true)

    // Try to add same user again
    const result2 = await addUserToMeeting(meeting.id, user.id)
    expect(result2.success).toBe(true)
    expect(result2.message).toContain('already')

    // Verify only one attendance record
    const attendances = await prisma.meetingAttendance.findMany({
      where: { meetingId: meeting.id, userId: user.id }
    })
    expect(attendances).toHaveLength(1)
  })
})
```

## 🔐 Security Testing

### Meeting Security Verification
```typescript
// tests/security/meeting-security.test.ts
import { 
  enhanceMeetingSecurity,
  getMeetingSecurityStatus,
  google_create_meet 
} from '@/lib/meetingLink'

describe('Meeting Security', () => {
  it('enforces private meeting visibility', async () => {
    const meetingData = {
      title: 'Security Test Meeting',
      start: new Date('2024-02-01T21:00:00Z'),
      duration: 60
    }

    const result = await google_create_meet(meetingData)
    
    expect(result.meetingData.visibility).toBe('private')
    expect(result.meetingData.anyoneCanAddSelf).toBe(false)
  })

  it('prevents guest invitations and modifications', async () => {
    const meetingData = {
      title: 'Guest Restriction Test',
      start: new Date('2024-02-01T21:00:00Z'),
      duration: 60
    }

    const result = await google_create_meet(meetingData)
    
    expect(result.meetingData.guestsCanInviteOthers).toBe(false)
    expect(result.meetingData.guestsCanModify).toBe(false)
    expect(result.meetingData.guestsCanSeeOtherGuests).toBe(true)
  })

  it('includes security tracking in extended properties', async () => {
    const meetingData = {
      title: 'Extended Properties Test',
      start: new Date('2024-02-01T21:00:00Z'),
      duration: 60
    }

    const result = await google_create_meet(meetingData)
    const props = result.meetingData.extendedProperties
    
    expect(props.private.goaleTeApp).toBe('true')
    expect(props.private.securityLevel).toBe('invite-only')
    expect(props.private.accessControl).toBe('restricted')
    expect(props.shared.platform).toBe('goalete')
  })

  it('validates security status correctly', async () => {
    const mockEventData = {
      visibility: 'private',
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      extendedProperties: {
        private: {
          securityLevel: 'invite-only',
          accessControl: 'restricted'
        }
      }
    }

    const status = getMeetingSecurityStatus(mockEventData)
    
    expect(status.isSecure).toBe(true)
    expect(status.securityLevel).toBe('high')
    expect(status.checks.privateVisibility).toBe(true)
    expect(status.checks.guestRestrictions).toBe(true)
  })
})
```

### Cross-Domain Testing
```typescript
// tests/security/cross-domain.test.ts
import { 
  validateCrossDomainEmails,
  google_add_users_to_meeting_cross_domain 
} from '@/lib/meetingLink'

describe('Cross-Domain Functionality', () => {
  it('validates diverse email domains', () => {
    const emails = [
      'user@gmail.com',           // Consumer
      'admin@company.co.uk',      // Corporate UK
      'student@university.edu',    // Educational
      'contact@startup.io',       // Modern TLD
      'team@organization.org',    // Organization
      'support@service.ai'        // AI domain
    ]

    const result = validateCrossDomainEmails(emails)
    
    expect(result.isValid).toBe(true)
    expect(result.totalEmails).toBe(6)
    expect(result.totalDomains).toBe(6)
    expect(result.domainStats.gmail).toBe(1)
    expect(result.domainStats.corporate).toBe(5)
  })

  it('handles international domain extensions', () => {
    const emails = [
      'user@example.de',          // Germany
      'contact@company.jp',       // Japan
      'admin@service.com.au',     // Australia
      'team@startup.co.in'        // India
    ]

    const result = validateCrossDomainEmails(emails)
    
    expect(result.isValid).toBe(true)
    expect(result.totalDomains).toBe(4)
    expect(result.internationalDomains).toBe(4)
  })

  it('adds cross-domain users with proper analytics', async () => {
    const meetingId = 'test-meeting-id'
    const emails = [
      'user1@gmail.com',
      'user2@company.com',
      'user3@university.edu'
    ]

    const result = await google_add_users_to_meeting_cross_domain(
      meetingId, 
      emails
    )

    expect(result.success).toBe(true)
    expect(result.analytics.totalDomains).toBe(3)
    expect(result.analytics.domainBreakdown.gmail).toBe(1)
    expect(result.analytics.domainBreakdown.corporate).toBe(2)
  })
})
```

## 🎭 End-to-End Testing

### Admin Dashboard E2E
```typescript
// tests/e2e/admin-dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.fill('[data-testid="admin-email"]', 'admin@goalete.com')
    await page.fill('[data-testid="admin-password"]', 'test-password')
    await page.click('[data-testid="login-button"]')
  })

  test('creates new meeting successfully', async ({ page }) => {
    // Navigate to meeting creation
    await page.click('[data-testid="create-meeting-button"]')
    
    // Fill meeting form
    await page.fill('[data-testid="meeting-title"]', 'E2E Test Meeting')
    await page.fill('[data-testid="meeting-date"]', '2024-02-01')
    await page.fill('[data-testid="meeting-time"]', '21:00')
    await page.fill('[data-testid="meeting-duration"]', '60')
    
    // Add attendees
    await page.fill('[data-testid="attendee-emails"]', 'user1@gmail.com\nuser2@company.com')
    
    // Submit form
    await page.click('[data-testid="create-meeting-submit"]')
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('text=E2E Test Meeting')).toBeVisible()
  })

  test('displays meeting analytics correctly', async ({ page }) => {
    await page.goto('/admin/analytics')
    
    // Check analytics widgets
    await expect(page.locator('[data-testid="total-meetings"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="cross-domain-stats"]')).toBeVisible()
    
    // Verify charts load
    await expect(page.locator('[data-testid="meetings-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="domain-breakdown-chart"]')).toBeVisible()
  })
})
```

### Meeting Creation Workflow
```typescript
// tests/e2e/meeting-creation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Meeting Creation Workflow', () => {
  test('complete meeting creation and invite process', async ({ page }) => {
    // Admin creates meeting
    await page.goto('/admin')
    await loginAsAdmin(page)
    
    const meetingData = {
      title: 'Complete Workflow Test',
      date: '2024-02-01',
      time: '21:00',
      attendees: ['user1@gmail.com', 'user2@company.com']
    }
    
    await createMeeting(page, meetingData)
    
    // Verify meeting appears in calendar
    await page.goto('/admin/calendar')
    await expect(page.locator(`text=${meetingData.title}`)).toBeVisible()
    
    // Check meeting security settings
    await page.click(`[data-meeting-title="${meetingData.title}"]`)
    await expect(page.locator('[data-testid="security-status"]')).toContainText('Secure')
    await expect(page.locator('[data-testid="visibility"]')).toContainText('Private')
    
    // Verify cross-domain analytics
    await expect(page.locator('[data-testid="domain-count"]')).toContainText('2')
    await expect(page.locator('[data-testid="attendee-count"]')).toContainText('2')
  })
})
```

## ⚡ Performance Testing

### Load Testing
```typescript
// tests/performance/load-testing.ts
import { performance } from 'perf_hooks'

describe('Performance Tests', () => {
  it('handles multiple concurrent meeting creations', async () => {
    const concurrentRequests = 10
    const promises = []
    
    const startTime = performance.now()
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch('/api/admin/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Load Test Meeting ${i}`,
            date: '2024-02-01',
            time: '21:00',
            attendees: generateTestEmails(50) // 50 attendees per meeting
          })
        })
      )
    }
    
    const responses = await Promise.all(promises)
    const endTime = performance.now()
    
    // All requests should succeed
    expect(responses.every(r => r.ok)).toBe(true)
    
    // Should complete within reasonable time (adjust threshold as needed)
    const totalTime = endTime - startTime
    expect(totalTime).toBeLessThan(5000) // 5 seconds
    
    console.log(`${concurrentRequests} meetings created in ${totalTime}ms`)
  })

  it('handles large attendee lists efficiently', async () => {
    const largeAttendeeList = generateTestEmails(200) // 200 attendees
    
    const startTime = performance.now()
    
    const response = await fetch('/api/admin/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Large Meeting Test',
        date: '2024-02-01',
        time: '21:00',
        attendees: largeAttendeeList
      })
    })
    
    const endTime = performance.now()
    const responseTime = endTime - startTime
    
    expect(response.ok).toBe(true)
    expect(responseTime).toBeLessThan(10000) // 10 seconds for 200 attendees
    
    console.log(`Meeting with 200 attendees created in ${responseTime}ms`)
  })
})
```

## 🔍 Test Utilities

### Test Data Factories
```typescript
// tests/utils/factories.ts
export function createTestUser(overrides = {}) {
  return {
    id: generateId(),
    email: `test-${generateId()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    subscriptionStatus: 'active',
    isActive: true,
    ...overrides
  }
}

export function createTestMeeting(overrides = {}) {
  return {
    id: generateId(),
    title: 'Test Meeting',
    scheduledDate: new Date('2024-02-01T21:00:00Z'),
    duration: 60,
    platform: 'google-meet',
    status: 'scheduled',
    ...overrides
  }
}

export function generateTestEmails(count: number): string[] {
  const domains = ['gmail.com', 'company.com', 'university.edu', 'startup.io']
  return Array.from({ length: count }, (_, i) => 
    `user${i}@${domains[i % domains.length]}`
  )
}
```

### Database Test Helpers
```typescript
// tests/utils/database.ts
import { prisma } from '@/lib/prisma'

export async function setupTestDatabase() {
  // Clear all test data
  await prisma.meetingAttendance.deleteMany()
  await prisma.meeting.deleteMany()
  await prisma.user.deleteMany()
  await prisma.familyPlan.deleteMany()
}

export async function createTestUsers(count: number) {
  const users = Array.from({ length: count }, (_, i) => createTestUser({
    email: `testuser${i}@example.com`
  }))
  
  return await prisma.user.createMany({
    data: users,
    skipDuplicates: true
  })
}

export async function cleanupTestDatabase() {
  await setupTestDatabase()
}
```

## 📊 Test Coverage

### Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.config.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Coverage Targets
- **Unit Tests**: 90%+ coverage for utility functions
- **Integration Tests**: 80%+ coverage for API routes
- **Security Tests**: 100% coverage for security functions
- **Component Tests**: 85%+ coverage for React components

## 🚨 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run security tests
        run: npm run test:security
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 📋 Testing Checklist

### Pre-Commit Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Coverage meets threshold

### Pre-Deploy Testing
- [ ] All test suites pass
- [ ] E2E tests complete successfully
- [ ] Performance tests within limits
- [ ] Security verification passes
- [ ] Database migrations tested
- [ ] Environment configuration validated

### Production Testing
- [ ] Health checks pass
- [ ] API endpoints responsive
- [ ] Database connectivity confirmed
- [ ] Google Calendar integration working
- [ ] Email functionality operational
- [ ] Security features active

---

**Related Documentation:**
- [Development Guide](./development-guide.md)
- [Security Implementation](./security-implementation-summary.md)
- [API Documentation](./api-documentation.md)
