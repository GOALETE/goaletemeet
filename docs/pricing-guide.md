# Pricing Configuration Guide

## Overview

This document explains the centralized pricing configuration system for Goalete. All pricing-related information is maintained in a single location (`lib/pricing.ts`) to ensure consistency throughout the application.

## Pricing Structure

The pricing configuration is stored in the `PLAN_PRICING` object which contains:

```typescript
export const PLAN_PRICING = {
  daily: {
    amount: 299,         // Price in INR
    display: "Rs. 299",  // Formatted display price
    duration: 1,         // Duration in days
    name: "Daily Session"
  },
  monthly: {
    amount: 2999,        // Price in INR
    display: "Rs. 2999", // Formatted display price
    duration: 30,        // Duration in days
    name: "Monthly Plan"
  },
  monthlyFamily: {
    amount: 4499,        // Price in INR
    display: "Rs. 4499 (Family, 2 users)", // Formatted display price
    duration: 30,        // Duration in days
    name: "Monthly Family Plan"
  }
};
```

## Plan Types

The application supports the following plan types:

| Plan Type | Description | Features |
|-----------|-------------|----------|
| daily | Single day access | Access to one meeting session |
| monthly | 30-day access for one person | Access to all meetings for one month |
| monthlyFamily | 30-day access for two people | Access to all meetings for two users |
| unlimited | Admin-only plan | Unlimited access (not available for regular registration) |

## Helper Functions

The pricing module includes several helper functions to maintain consistency:

1. `toPaise(amount)`: Converts INR to paise (smallest currency unit for INR) for use with payment gateways
2. `fromPaise(paise)`: Converts paise back to INR
3. `formatPrice(amount)`: Formats a number as a price string with currency symbol
4. `getPlanPricing(planType)`: Gets pricing details for a specific plan

## Usage Examples

### Importing the module

```typescript
import { PLAN_PRICING, toPaise, fromPaise, formatPrice } from "@/lib/pricing";
```

### Getting plan information

```typescript
// Get details for the monthly plan
const monthlyPlan = PLAN_PRICING.monthly;
console.log(monthlyPlan.amount); // 2999
console.log(monthlyPlan.display); // "Rs. 2999"
console.log(monthlyPlan.duration); // 30 days
```

### Converting prices for payment gateway

```typescript
// For Razorpay (requires amount in paise)
const amountInPaise = toPaise(PLAN_PRICING.daily.amount);
console.log(amountInPaise); // 29900
```

### Formatting prices for display

```typescript
// Format custom amount
const customAmount = 1234;
console.log(formatPrice(customAmount)); // "Rs. 1234"
```

## Family Plan Subscription Process

### Overview

The Monthly Family Plan allows two users to register under a single payment, creating two separate user accounts with their own subscriptions.

### Frontend Implementation

1. **Registration Form**:
   - Shows additional fields for the second person when "Monthly Family" is selected
   - Collects name, email, and phone for both users
   - Validates both sets of user information

2. **Payment Process**:
   - Creates a single Razorpay order for the total amount (Rs. 4499)
   - On successful payment, sends both users' information to the backend

### Backend Implementation

1. **User Creation**:
   - Creates two separate user records in the database
   - Each user has their own unique ID and credentials

2. **Subscription Records**:
   - Creates two subscription records in the database
   - Each subscription has:
     - Half the total amount (Rs. 2249.50 each)
     - Same start and end dates
     - Linked to their respective user ID

3. **Payment Processing**:
   - Single payment record in Razorpay
   - Both subscription IDs are associated with this payment
   - Payment success updates both subscriptions

### Implementation Details

For developers implementing or modifying the family plan:

1. **In `lib/pricing.ts`**:
   - The `monthlyFamily` plan type is defined with amount, display, duration, and name

2. **In `RegistrationForm.tsx`**:
   - Conditional rendering for second user fields
   - Modified form validation and submission logic
   - Handles subscriptionId (single) and subscriptionIds (array) formats

3. **In `api/createOrder/route.ts`**:
   - Handles both single user and family plan registrations
   - Creates multiple records for family plans
   - Ensures emails are sent to all users

## How to Update Prices

When you need to change the pricing, simply update the values in `lib/pricing.ts`. The changes will automatically propagate to all parts of the application that use this centralized configuration.

Example:
```typescript
// To change the daily session price from Rs. 499 to Rs. 599:
export const PLAN_PRICING = {
  daily: {
    amount: 599,
    display: "Rs. 599",
    duration: 1,
    name: "Daily Session"
  },
  monthly: {
    amount: 2999,
    display: "Rs. 2999",
    duration: 30,
    name: "Monthly Plan"
  },
  monthlyFamily: {
    amount: 4499,
    display: "Rs. 4499 (Family, 2 users)",
    duration: 30,
    name: "Monthly Family Plan"
  }
};
```

## Locations Using Pricing Information

The centralized pricing configuration is used in:

1. `RegistrationForm.tsx` - For display and payment processing
2. `createOrder/route.ts` - For creating payment orders
3. `scripts/test-email.ts` - For testing subscription emails

## Best Practices

1. Always use the helper functions for conversions and formatting
2. Never hardcode price values in the application
3. Maintain the display values to match the actual amount
4. When adding new pricing plans, follow the existing structure
