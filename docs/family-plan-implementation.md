# Monthly Family Plan Implementation Guide

## Overview

The Monthly Family Plan is a subscription option that allows two users to register under a single payment, creating individual user accounts and subscription records for both users. This document provides a detailed explanation of how the family plan is implemented across the application.

## Key Features

- **Single Payment**: One payment (₹4499) covers two users
- **Two User Accounts**: Creates separate user records for both individuals
- **Separate Subscriptions**: Each user gets their own subscription record with proper tracking
- **Individual Meeting Access**: Both users receive their own meeting invites

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

The form dynamically shows additional fields for the second person when the Monthly Family plan is selected:

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
const validateForm = () => {
  // ...validation for primary user
  
  // Validation for second user fields only if family plan is selected
  secondFirstName: plan === 'monthlyFamily' ? 
    (secondFirstName.trim() === '' ? 'First name is required' : '') : '',
  // ...similar validation for other second user fields
};

// Form submission includes second user data
const handleSubmit = async (e: React.FormEvent) => {
  // ...form processing
  
  // Add second person details for family plan
  const requestBody = {
    // ...primary user details
    ...(plan === "monthlyFamily" ? {
      secondFirstName,
      secondLastName,
      secondEmail,
      secondPhone
    } : {})
  };
  
  // Send to createOrder API
  const response = await fetch("/api/createOrder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  
  // Handle response which includes subscriptionId(s)
  // For family plan, response has subscriptionIds array
  // For single user plans, response has single subscriptionId
};
```

### 3. Backend Order Creation (`app/api/createOrder/route.ts`)

The backend distinguishes between single-user and family plan orders:

```typescript
if (planType === "monthlyFamily") {
  // Validate second person fields
  if (!secondFirstName || !secondLastName || !secondEmail || !secondPhone) {
    return NextResponse.json({ message: "Second person details required for family plan." }, { status: 400 });
  }
  
  // Create or fetch both users
  const [user1, user2] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.upsert({
      where: { email: secondEmail },
      update: {},
      create: {
        firstName: secondFirstName,
        lastName: secondLastName,
        email: secondEmail,
        phone: secondPhone,
        source: "Family Plan",
      },
    })
  ]);
  
  // Check subscription eligibility for both users
  // ...eligibility checks
  
  // Create Razorpay order (single order for both subscriptions)
  const order = await razorpay.orders.create({
    amount: amount, // in paise
    currency,
    receipt: `receipt#${Date.now()}`,
    notes: {
      description: "Payment for family subscription",
      plan_type: planType,
      // ...other metadata including both users
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
3. Form creates a single Razorpay order for ₹4499
4. Backend creates two user records (if needed)
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
