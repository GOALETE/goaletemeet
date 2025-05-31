# Subscription Protection in GoaleteMeet

GoaleteMeet includes advanced protection against duplicate and overlapping subscriptions based on plan types and subscription dates.

## Protection Implementation

### Backend Protection

1. **At User Creation/Lookup**
   - When a user is created or looked up by email, the system checks if they already have an active subscription
   - The `createUser` endpoint returns a `hasActiveSubscription` flag and the subscription end date
   - This is implemented in `app/api/createUser/route.ts`

2. **At Order Creation**
   - When a new order is created, the system checks if the user has any overlapping subscriptions
   - The system uses specialized functions to validate different subscription scenarios
   - This is implemented in `app/api/createOrder/route.ts`

3. **Subscription Validation Rules**
   - The system prevents the following overlapping scenarios:
     - User with a daily plan trying to buy a monthly plan that overlaps
     - User with a monthly plan trying to buy a daily plan that falls within that month
     - User with a daily plan trying to buy another daily plan for the same date
   - Users can subscribe to non-overlapping plans regardless of the plan type

### Frontend Protection

1. **User Registration Flow**
   - The registration form checks for active subscriptions when a user enters their email
   - If the user already has an active subscription, a clear error message is displayed
   - The message includes the end date of the current subscription

2. **Order Creation Flow**
   - If a user tries to create an order with an overlapping subscription, the system prevents the payment flow
   - The payment gateway is not initialized and the user is shown an error message with details about the overlap

## Error Messages

Users will see different error messages based on the specific overlap scenario:

1. Monthly plan overlapping with an existing daily plan:
> Cannot purchase a monthly plan that overlaps with your existing daily plan from [START_DATE] to [END_DATE].

2. Daily plan overlapping with an existing monthly plan:
> Cannot purchase a daily plan that overlaps with your existing monthly plan from [START_DATE] to [END_DATE].

3. Daily plan overlapping with another daily plan:
> Cannot purchase a daily plan that overlaps with your existing daily plan from [START_DATE] to [END_DATE].

## Technical Implementation

The protection is implemented in two key files:

1. **Subscription Library (`lib/subscription.ts`)**
   ```typescript
   // Check if user can subscribe based on the proposed dates and plan type
   export async function canUserSubscribeForDates(email: string, startDate: Date, endDate: Date, planType?: string) {
     // Detailed overlap validation logic based on plan types
     // Returns whether user can subscribe and reason if not
   }
   
   // Check if user can subscribe
   export async function canUserSubscribe(email: string, planType?: string, startDate?: Date, endDate?: Date) {
     // General subscription validation with optional dates and plan type
   }
   ```

2. **API Route Implementation**
   ```typescript
   // Check if user can subscribe for these dates with the specific plan type
   const subscriptionCheck = await canUserSubscribeForDates(
     user.email, 
     subscriptionStartDate, 
     subscriptionEndDate,
     planType
   );
   
   if (!subscriptionCheck.canSubscribe) {
     return NextResponse.json({ 
       message: "Cannot create subscription", 
       details: subscriptionCheck.reason,
       subscriptionDetails: subscriptionCheck.subscriptionDetails
     }, { status: 409 });
   }
   ```

## Testing the Protection

To test the subscription protection:

1. Create a user with a daily plan subscription
2. Try to register for a monthly plan that overlaps with the daily plan
3. Verify that the system shows the appropriate error message
4. Try to register for a daily plan on a different date (no overlap)
5. Verify that the system allows the subscription
6. Create a user with a monthly plan
7. Try to register for a daily plan within the monthly subscription period
8. Verify that the system prevents the overlapping subscription
