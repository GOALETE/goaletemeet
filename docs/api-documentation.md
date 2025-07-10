# GoaleteMeet API Documentation

This document provides comprehensive documentation for the GoaleteMeet API endpoints, including request/response formats, authentication requirements, and error handling.

## Base URL

All API endpoints are relative to the base URL of your deployment:

- **Development**: `http://localhost:3000/api`
- **Production**: `https://yourdomain.com/api`

## Authentication

Some API endpoints require authentication:

- **Admin API Routes**: Require an admin session or API key

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Detailed error description or code",
  "timestamp": "2025-06-16T12:34:56.789Z"
}
```

HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Server Error

## API Endpoints

### Check Subscription

Checks if a user can subscribe to a plan based on their email and optional parameters.

- **URL**: `/check-subscription`
- **Method**: `POST`
- **Authentication**: None

**Request Body**:
```json
{
  "email": "user@example.com",
  "planType": "monthly",
  "startDate": "2025-06-16",
  "endDate": "2025-07-16"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "canSubscribe": true,
  "message": "Available for Subscription",
  "subscriptionDetails": null,
  "metadata": {
    "responseTime": 120,
    "timestamp": "2025-06-16T12:34:56.789Z"
  }
}
```

**Error Response** (400):
```json
{
  "success": false,
  "message": "Invalid input",
  "details": {
    "fieldErrors": {
      "email": ["Valid email address is required"]
    }
  }
}
```

### Daily Meeting Invites (Cron Job)

Sends meeting invites to all users with active subscriptions for the current day.

- **URL**: `/cron-daily-invites`
- **Method**: `GET`
- **Authentication**: Required (`apiKey` query parameter)

**Request Parameters**:
```
?apiKey=your-cron-api-key&testMode=true
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Sent 5 invites successfully, 0 failed",
  "timestamp": "2025-06-16T12:34:56.789Z",
  "metrics": {
    "duration": 3245,
    "successRate": 100
  },
  "meetingDetails": {
    "id": "meeting-id",
    "date": "2025-06-16",
    "platform": "google-meet",
    "startTime": "2025-06-16T21:00:00.000Z",
    "endTime": "2025-06-16T22:00:00.000Z",
    "title": "GOALETE Club Daily Session"
  },
  "invitesSent": [
    {
      "userId": "user-id-1",
      "subscriptionId": "subscription-id-1",
      "email": "user1@example.com",
      "planType": "monthly",
      "sentAt": "2025-06-16T12:34:56.789Z",
      "status": "sent",
      "meetingLink": "https://meet.google.com/abc-defg-hij"
    }
  ]
}
```

**Error Response** (401):
```json
{
  "success": false,
  "message": "Unauthorized access",
  "timestamp": "2025-06-16T12:34:56.789Z"
}
```

### Send Meeting Invite

Sends a meeting invite to a specific user for a specific date.

- **URL**: `/send-meeting-invite`
- **Method**: `POST`
- **Authentication**: None (consider adding authentication for production)

**Request Body**:
```json
{
  "email": "user@example.com",
  "date": "2025-06-16",
  "testMode": false
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Meeting invite sent successfully",
  "meetingLink": "https://meet.google.com/abc-defg-hij",
  "meetingDetails": {
    "id": "meeting-id",
    "date": "2025-06-16",
    "platform": "google-meet",
    "startTime": "2025-06-16T21:00:00.000Z",
    "endTime": "2025-06-16T22:00:00.000Z"
  }
}
```

**Error Response** (400):
```json
{
  "success": false,
  "message": "Invalid email format",
  "timestamp": "2025-06-16T12:34:56.789Z"
}
```

### Create User

Creates a new user with basic information.

- **URL**: `/createUser`
- **Method**: `POST`
- **Authentication**: None (public registration endpoint)

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "source": "website",
  "referenceName": "Jane Smith"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "user-id",
    "email": "john.doe@example.com"
  }
}
```

**Error Response** (400):
```json
{
  "success": false,
  "message": "User with this email already exists",
  "timestamp": "2025-06-16T12:34:56.789Z"
}
```

## Best Practices

1. **Rate Limiting**: The API has rate limiting to prevent abuse. Don't exceed 100 requests per minute.
2. **Error Handling**: Always check the `success` field in responses.
3. **Timeouts**: Set appropriate timeouts for API calls (suggested: 30 seconds).
4. **Logging**: All API requests are logged for security and debugging.

## Testing

You can use the provided test scripts to verify API functionality:

```bash
npm run test:api-endpoints
```

---

For any questions or issues with the API, please contact the development team.
