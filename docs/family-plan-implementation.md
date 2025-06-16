# Monthly Family Plan Implementation Guide

## Overview

The Monthly Family Plan is a subscription option that allows two users to register under a single payment, creating individual user accounts and subscription records for both users. This document provides a detailed explanation of how the family plan is implemented across the application.

## Key Features

- **Single Payment**: One payment (₹4499) covers two users
- **Two User Accounts**: Creates separate user records for both individuals through a consistent frontend flow
- **Separate Subscriptions**: Each user gets their own subscription record with proper tracking
- **Individual Meeting Access**: Both users receive their own meeting invites
- **Email Validation**: Ensures primary and secondary users have different email addresses (both frontend and backend validation)

## Implementation Details

### 1. Pricing Configuration (`lib/pricing.ts`)

```typescript
export const PLAN_PRICING = {
  // ...other plans
  monthlyFamily: {
    amount: 4499,        // Price in INR
    display: "Rs. 4499 (Family, 2 users)", // Formatted display price
    duration: 30,        // Duration in days
    name: "Monthly Family Plan"
  }
};

// Type definition includes family plan
export type PlanType = "daily" | "monthly" | "monthlyFamily" | "unlimited";
```

### 2. Registration Form (`app/components/RegistrationForm.tsx`)

The form follows a user-friendly flow with plan selection, date selection, and personal details. It dynamically shows additional fields for the second person when the Monthly Family plan is selected:

```typescript
// State for second person
const [secondFirstName, setSecondFirstName] = useState("");
const [secondLastName, setSecondLastName] = useState("");
const [secondEmail, setSecondEmail] = useState("");
const [secondPhone, setSecondPhone] = useState("");

// Plan selection handler
const handlePlanChange = (newPlan: "daily" | "monthly" | "monthlyFamily") => {
  setPlan(newPlan);
  // Clear second person fields if not family plan
  if (newPlan !== "monthlyFamily") {
    setSecondFirstName("");
    setSecondLastName("");
    setSecondEmail("");
    setSecondPhone("");
  }
};

// Form validation includes second person fields when applicable
// Email validation ensures emails are different for family plan
if (plan === 'monthlyFamily' && email === secondEmail) {
  setErrorMessage("Primary and secondary users must have different email addresses");
  return false;
}

// Form submission process for family plan creates both users via API
const handleSubmit = async (e: React.FormEvent) => {
  // ...form validation and other processing
  
  // 1. Create primary user
  const userRes = await fetch("/api/createUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      phone,
      source,
      reference,
    }),      
  });
  const userData = await userRes.json();
  const userId = userData.userId;
  
  // 2. For family plan, create second user
  let secondUserId = null;
  if (plan === "monthlyFamily") {
    const secondUserRes = await fetch("/api/createUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: secondFirstName,
        lastName: secondLastName,
        email: secondEmail,
        phone: secondPhone,
        source: "Family Plan",
        reference: "",
      }),      
    });
    const secondUserData = await secondUserRes.json();
    secondUserId = secondUserData.userId;
  }
  
  // 3. Create order/subscription with both user IDs
  const orderRes = await fetch("/api/createOrder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: toPaise(price),
      currency: "INR",
      planType: plan,
      duration: PLAN_PRICING[plan].duration,
      startDate,
      userId,
      ...(plan === "monthlyFamily" ? { secondUserId } : {})
    }),
  });
  
  // Handle response which includes subscriptionId(s)
  // For family plan, response has subscriptionIds array
  // For single user plans, response has single subscriptionId
};
```

### 3. Backend Order Creation (`app/api/createOrder/route.ts`)

The backend distinguishes between single-user and family plan orders:

```typescript
// Schema to accept secondUserId for family plan
const orderBodySchema = z.object({
    amount: z.number().positive(),
    currency: z.string().min(1),
    planType: z.string().min(1),
    duration: z.number().positive(),
    startDate: z.string().optional(),
    userId: z.string().min(1),
    // Optional second user ID for family plan
    secondUserId: z.string().optional(),
});

// Family plan handling
if (planType === "monthlyFamily") {
  // Validate second user ID
  if (!secondUserId) {
    return NextResponse.json({ message: "Second user ID required for family plan." }, { status: 400 });
  }
  
  // Fetch both users by their IDs
  const [user1, user2] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findUnique({ where: { id: secondUserId } })
  ]);
  
  if (!user1 || !user2) {
    return NextResponse.json({ message: "User(s) not found." }, { status: 404 });
  }
  
  // Check that primary and secondary emails are different
  if (user1.email === user2.email) {
    return NextResponse.json({ 
      message: "Invalid family plan registration", 
      details: "Primary and secondary users must have different email addresses"
    }, { status: 400 });
  }
  
  // Check subscription eligibility for both users
  const [canSub1, canSub2] = await Promise.all([
    canUserSubscribeForDates(user1.email, subscriptionStartDate, subscriptionEndDate, planType),
    canUserSubscribeForDates(user2.email, subscriptionStartDate, subscriptionEndDate, planType)
  ]);
  
  if (!canSub1.canSubscribe) {
    return NextResponse.json({ message: "Primary user cannot subscribe", details: canSub1.reason }, { status: 409 });
  }
  if (!canSub2.canSubscribe) {
    return NextResponse.json({ message: "Second user cannot subscribe", details: canSub2.reason }, { status: 409 });
  }
  
  // Create Razorpay order (single order for both subscriptions)
  const order = await razorpay.orders.create({
    amount: amount, // in paise
    currency,
    receipt: `receipt#${Date.now()}`,
    notes: {
      description: "Payment for family subscription",
      plan_type: planType,
      // ...other metadata including both users
      second_user_id: secondUserId,
    },
  });
  
  // Create two subscriptions in DB with half price each
  const halfPrice = Math.round(fromPaise(amount) / 2);
  
  // Create subscription records for both users
  const [sub1, sub2] = await Promise.all([
    prisma.subscription.create({ data: data1 }), // First user subscription
    prisma.subscription.create({ data: data2 })  // Second user subscription
  ]);
  
  // Return both subscription IDs
  return NextResponse.json({ 
    orderId: order.id, 
    subscriptionIds: [sub1.id, sub2.id] 
  }, { status: 201 });
}
    orderId: order.id, 
    subscriptionIds: [sub1.id, sub2.id] 
  }, { status: 201 });
}

// Regular single-user plan handling
// ...normal subscription creation logic
```

### 4. Payment Success Handler

When payment is successful:

```typescript
// For family plans
if (Array.isArray(subscriptionIds)) {
  // Update multiple subscriptions
  await Promise.all(subscriptionIds.map(subId => 
    prisma.subscription.update({
      where: { id: subId },
      data: {
        paymentRef: paymentId,
        paymentStatus: "completed",
        status: "active"
      }
    })
  ));
  
  // Get user details for each subscription
  const subscriptions = await Promise.all(subscriptionIds.map(subId =>
    prisma.subscription.findUnique({
      where: { id: subId },
      include: { user: true }
    })
  ));
  
  // Send welcome emails to both users
  // Send family plan admin notification
}

// For single-user plans
// ...normal subscription update and email logic
```

### 5. Email Notifications (`lib/email.ts`)

For family plans, a special admin notification is sent:

```typescript
// Helper: family plan admin notification
async function sendFamilyAdminNotificationEmail({
  users,
  planType,
  startDate,
  endDate,
  amount,
  paymentId
}) {
  // Create a single email with details of both users
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>New Family Registration Notification</title>
      <style>/* ...styling... */</style>
    </head>
    <body>
      <div class="header">
        <h1>👨‍👩‍👧‍👦 New Family Registration Alert</h1>
      </div>
      <p>A new <b>Monthly Family Plan</b> registration and payment has been completed.</p>
      
      <div class="user-details">
        <h2>Family Members</h2>
        <table>
          ${users.map(u => `<tr>
            <td>${u.firstName} ${u.lastName}</td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${u.subscriptionId}</td>
          </tr>`).join('')}
        </table>
      </div>
      
      <!-- Subscription and payment details -->
    </body>
    </html>
  `;
  
  // Send email to admin
  return await sendEmail({
    to: adminEmail,
    subject: `New Family Registration: ${users.map(u => u.firstName).join(' & ')}`,
    html: htmlContent
  });
}
```

## Flow Diagrams

### Registration Flow

1. User selects "Monthly Family Plan" on registration form
2. User enters details for both people
3. User submits form which:
   - Creates primary user via `/api/createUser`
   - Creates secondary user via `/api/createUser`
   - Creates a single Razorpay order for ₹4499 via `/api/createOrder`
4. Backend validates both users exist and have different emails
5. Backend creates two subscription records, each for ₹2249.50
6. User completes payment
7. Both subscriptions are activated
8. Welcome emails sent to both users
9. Admin notification sent with details of both users

### Meeting Invite Flow

1. Daily CRON job runs to send meeting invites
2. System finds all active subscriptions
3. For each subscription user (including family plan members):
   - Creates personalized meeting invite
   - Sends email with meeting link
   - Attaches calendar invitation

## Testing

To test the family plan implementation:

1. Create a test registration with the Monthly Family plan
2. Verify two user accounts are created
3. Check both subscriptions are created with correct amounts
4. Complete test payment
5. Verify welcome emails to both users
6. Check admin notification contains both users
7. Run CRON job to verify meeting invites to both emails
8. Check admin dashboard shows both users properly

## Troubleshooting

Common issues:

1. **Missing Second User Fields**: Ensure all second person fields are properly validated
2. **Subscription ID Handling**: Check that payment handlers correctly process subscriptionId vs. subscriptionIds
3. **Email Delivery**: Verify both users receive emails independently
4. **Price Splitting**: Ensure the total amount is correctly split between subscriptions
