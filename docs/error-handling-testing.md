# Error Handling and Testing Guide for GoaleteMeet

This guide provides a comprehensive overview of error handling strategies, testing methodologies, and best practices for the GoaleteMeet application.

## Error Handling

### Standard Error Structure

All errors in the GoaleteMeet application follow this standardized structure:

```typescript
{
  success: false,
  message: "Human-readable error message",
  error: "Technical error details",
  details: {}, // Additional context-specific details
  timestamp: "2025-06-16T12:34:56.789Z"
}
```

### Error Handling Utilities

The `lib/errors.ts` module provides standardized error handling, logging, and response formatting:

```typescript
import { createErrorResponse, ErrorType, logError, ApiError } from "@/lib/errors";

// Create a standard error response
return createErrorResponse(
  ErrorType.BAD_REQUEST,
  "Invalid email format",
  error,
  { field: "email" }
);

// Log an error with context
logError("Failed to send meeting invite", error, { 
  userId, 
  email, 
  meetingId 
});

// Throw a specialized API error
throw new ApiError("User not found", 404, { userId });
```

### Best Practices

1. **Be Specific**: Always provide clear, actionable error messages.
2. **Log Context**: Include relevant context when logging errors.
3. **Use Try/Catch**: Wrap all async operations in try/catch blocks.
4. **Validate Input**: Use Zod to validate all incoming data.
5. **Centralize Handling**: Use the utilities in `lib/errors.ts`.

### Common Error Scenarios

| Scenario | Error Type | Response Code |
|----------|------------|---------------|
| Invalid input data | BAD_REQUEST | 400 |
| Missing authentication | UNAUTHORIZED | 401 |
| Insufficient permissions | FORBIDDEN | 403 |
| Resource not found | NOT_FOUND | 404 |
| Server failure | INTERNAL_ERROR | 500 |

## Testing

### Testing Framework

GoaleteMeet uses a custom testing framework built on Node.js with the following features:

- Sequential test execution
- Detailed reporting
- Time tracking
- Isolated test environments

### Test Scripts

The following test scripts are available:

```bash
# Core functionality tests
npm run test:email-functionality   # Test email sending with retry logic
npm run test:daily-cron            # Test daily invite cron job
npm run test:meeting-management    # Test meeting creation and management
npm run test:api-endpoints         # Test API endpoints

# Feature-specific tests
npm run test:family-plan           # Test family plan registration
npm run test:meetings              # Test meeting integration
npm run test:admin                 # Test admin authentication

# Run all core tests
npm run test:all
```

### Writing Tests

When writing tests, follow these guidelines:

1. **Isolation**: Each test should run independently.
2. **Cleanup**: Clean up any test data created.
3. **Assertions**: Include clear assertions with error messages.
4. **Error Handling**: Catch and report errors properly.

Example test structure:

```typescript
async function runTest(name: string, testFn: () => Promise<void>) {
  console.log(`\nRunning test: ${name}`);
  
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(error);
    hasErrors = true;
  }
}

// Example test
await runTest("User Registration", async () => {
  // Test code here
  if (!result.success) {
    throw new Error(`Registration failed: ${result.message}`);
  }
});
```

### Mocking

For tests that require external services, use environment variables to enable test modes:

```typescript
// In your API code
const isTestMode = process.env.NODE_ENV === 'test' || request.query.testMode === 'true';

if (isTestMode) {
  // Use mock services instead of real ones
  return mockSendEmail(options);
}
```

## Monitoring and Observability

### Logging

All critical operations should include structured logging:

```typescript
console.log(`Processing invite for user ${email}`, {
  subscriptionId,
  userId,
  timestamp: new Date().toISOString()
});
```

### Performance Tracking

Track performance metrics for critical operations:

```typescript
const startTime = Date.now();
// Operation code
const duration = Date.now() - startTime;
console.log(`Operation completed in ${duration}ms`);
```

### Error Rate Monitoring

The API provides success metrics that should be monitored:

```json
{
  "metrics": {
    "duration": 3245,
    "successRate": 95,
    "invitesSent": 19,
    "invitesFailed": 1
  }
}
```

## Incident Response

When an incident occurs:

1. **Identify**: Use logs to identify the source and scope.
2. **Isolate**: Determine if it affects specific users or features.
3. **Resolve**: Fix the immediate issue.
4. **Prevent**: Implement checks to prevent recurrence.

## Conclusion

Following these error handling and testing practices will help maintain a robust, reliable GoaleteMeet application. Remember that good error handling leads to better user experience, easier debugging, and more stable code.
