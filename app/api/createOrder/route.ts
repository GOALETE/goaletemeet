import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { canUserSubscribeForDates } from "@/lib/subscription";
import { manageMeeting } from "@/lib/meetingLink";
import { toPaise, fromPaise, PLAN_TYPES } from "@/lib/pricing";
import { sendAdminNotificationEmail, sendFamilyAdminNotificationEmail } from "@/lib/email";
import { sendImmediateInviteViaMessaging } from "@/lib/messaging";

// Get Razorpay keys from environment variables
const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

// Validate Razorpay keys are present
if (!key_id || !key_secret) {
    console.error("Razorpay keys are missing! Please check your environment variables.");
    // We'll continue and handle the error in the API handler
}

// Initialize Razorpay client if keys are available
let razorpay: Razorpay | null = null;
try {
  if (key_id && key_secret) {
    razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });
  }
} catch (error) {
  console.error("Failed to initialize Razorpay client:", error);
  // We'll handle this in the API handler
}

// Extend the schema to accept second person details for family plan
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

export type OrderBody = z.infer<typeof orderBodySchema>;

// Create order and DB subscription entry
export async function POST(request: NextRequest) {  
  try {
    const body = await request.json();
    const parsed = orderBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }    const { amount, currency, planType, duration, startDate, userId, secondUserId } = parsed.data;
    
    // Determine start and end dates based on duration using IST
    let subscriptionStartDate: Date;
    if (startDate) {
      subscriptionStartDate = new Date(startDate);
    } else {
      // Use current date in IST
      subscriptionStartDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    }
    
    let subscriptionEndDate: Date = new Date(subscriptionStartDate);
    
    // Calculate end date by adding the duration in days
    subscriptionEndDate.setDate(subscriptionStartDate.getDate() + duration);
    
    // Get user email for subscription check
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    
    if (!user) {
      return NextResponse.json({ 
        message: "User not found", 
        details: "The user ID provided does not exist in our system."
      }, { status: 404 });
    }
    
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
      }, { status: 409 }); // 409 Conflict
    }    // Handle comboPlan logic
    if (planType === PLAN_TYPES.COMBO_PLAN) {
      // Validate second user ID
      if (!secondUserId) {
        return NextResponse.json({ message: "Second user ID required for combo plan." }, { status: 400 });
      }

      // Fetch both users by their IDs
      const [user1, user2] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.user.findUnique({ where: { id: secondUserId } })
      ]);
      
      // Log user info for debugging
      console.log('FAMILY PLAN CHECK:');
      console.log('Primary user:', { id: user1?.id, email: user1?.email });
      console.log('Second user:', { id: user2?.id, email: user2?.email });
      
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
        return NextResponse.json({ 
          message: `Primary user (${user1.email}) cannot subscribe for the selected dates.`, 
          details: canSub1.reason 
        }, { status: 409 });
      }
      if (!canSub2.canSubscribe) {
        return NextResponse.json({ 
          message: `Second user (${user2.email}) cannot subscribe for the selected dates.`, 
          details: canSub2.reason 
        }, { status: 409 });
      }
      // Create Razorpay order (single order for both subscriptions)
      let order;
      try {
        if (!razorpay) throw new Error("Razorpay client is not initialized. Please check your environment variables.");
        order = await razorpay.orders.create({
          amount: amount, // already in paise
          currency,
          receipt: `receipt#${Date.now()}`,
          notes: {
            description: "Payment for family subscription",
            plan_type: planType,
            date: new Date().toISOString(),            startDate: subscriptionStartDate.toISOString(),
            endDate: subscriptionEndDate.toISOString(),
            user_id: userId,
            second_user_id: secondUserId,
          },
        });
        if (!order || !order.id) {
          return NextResponse.json({ message: 'Failed to create order with Razorpay', details: order }, { status: 502 });
        }
      } catch (razorpayError) {
        return NextResponse.json({ message: 'Razorpay order creation error', error: String(razorpayError) }, { status: 502 });
      }
      // Create two subscriptions in DB with half price each
      const halfPrice = Math.round(fromPaise(amount) / 2);
      const data1 = {
        userId: user1.id,
        planType,
        startDate: subscriptionStartDate,
        endDate: subscriptionEndDate,
        orderId: order.id,
        paymentRef: "",
        paymentStatus: "pending",
        status: "inactive",
        duration: duration,
        price: halfPrice,
      };
      const data2 = {
        userId: user2.id,
        planType,
        startDate: subscriptionStartDate,
        endDate: subscriptionEndDate,
        orderId: order.id,
        paymentRef: "",
        paymentStatus: "pending",
        status: "inactive",
        duration: duration,
        price: halfPrice,
      };
      const [sub1, sub2] = await Promise.all([
        prisma.subscription.create({ data: data1 }),
        prisma.subscription.create({ data: data2 })
      ]);
      return NextResponse.json({ orderId: order.id, subscriptionIds: [sub1.id, sub2.id] }, { status: 201 });
    }

    const options = {
      amount: amount, // Ensure this is in the smallest currency unit (e.g., paise for INR)
      currency: currency, // Already validated by schema
      receipt: `receipt#${Date.now()}`,
      notes: {
        description: "Payment for subscription",
        plan_type: planType,
        date: new Date().toISOString(),
        startDate: subscriptionStartDate.toISOString(), // Serialize as string
        endDate: subscriptionEndDate.toISOString(), // Serialize as string
        user_id: userId,
      }
    };
    console.log("options package:", options)

    let order;
    try {
      // Check if Razorpay client is initialized
      if (!razorpay) {
        throw new Error("Razorpay client is not initialized. Please check your environment variables.");
      }
      
      // Create order with Razorpay
      order = await razorpay.orders.create(options);
      
      if (!order || !order.id) {
        console.error('Razorpay order creation failed:', order);
        return NextResponse.json({ message: 'Failed to create order with Razorpay', details: order }, { status: 502 });
      }
    } catch (razorpayError) {
      console.error('Error from Razorpay:', razorpayError);
      return NextResponse.json({ 
        message: 'Razorpay order creation error', 
        error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError) 
      }, { status: 502 });
    }
    console.log("order:", order)
    
    // Create subscription entry in DB
    // Create base data object
    const data: any = {
        userId,
        planType,
        startDate: subscriptionStartDate,
        endDate: subscriptionEndDate,
        orderId: order.id,
        paymentRef: "",
        paymentStatus: "pending",
        status: "inactive",
        duration: duration,
        price: fromPaise(amount), // Convert paise to rupees using helper function
    };
    
    // create subscription `in DB
    const subscription = await prisma.subscription.create({
      data,
    });
    
    return NextResponse.json({ orderId: order.id, subscriptionId: subscription.id }, { status: 201 });
  } catch (error) {
    console.log("Error in createorder:", error)
    return NextResponse.json({ message: "Server Error", error: String(error) }, { status: 500 });
  }
}

// PATCH: update both subscriptions for family plan
export async function PATCH(request: NextRequest) {
  try {
    const { subscriptionId, subscriptionIds, orderId, paymentId, userId, status, paymentStatus } = await request.json();
    if (!orderId || !paymentId || !status) {
      return NextResponse.json({ message: "orderId, paymentId, and status required" }, { status: 400 });
    }
    // Find all subscriptions for this order (handles both single and family)
    const subscriptions = await prisma.subscription.findMany({
      where: { orderId },
      include: { user: true },
    });
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "Subscription(s) not found" }, { status: 404 });
    }
    // If subscriptionIds is provided, filter to only those
    let subsToUpdate = subscriptions;
    if (Array.isArray(subscriptionIds) && subscriptionIds.length > 0) {
      subsToUpdate = subscriptions.filter(sub => subscriptionIds.includes(sub.id));
    }
    // Update all relevant subscriptions for this order
    const updatedSubs = await Promise.all(subsToUpdate.map(sub =>
      prisma.subscription.update({
        where: { id: sub.id },
        data: {
          paymentRef: paymentId,
          paymentStatus: paymentStatus || "success",
          status,
        },
        include: { user: true }
      })
    ));
    // Send emails to all users
    const { sendWelcomeEmail, sendMeetingInvite, sendAdminNotificationEmail } = await import("@/lib/email");
    
    // For family plans registering for today, handle meeting creation intelligently
    let sharedTodayMeeting: any = null;
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    today.setHours(0, 0, 0, 0);
    
    // Process family plan users together for today's meetings
    if (updatedSubs.length > 1) {
      // Check if any subscription starts today
      const todaySubscriptions = updatedSubs.filter(sub => {
        const subscriptionStartDate = new Date(sub.startDate);
        subscriptionStartDate.setHours(0, 0, 0, 0);
        return subscriptionStartDate.getTime() === today.getTime();
      });
      
      if (todaySubscriptions.length > 0) {
        console.log(`Family plan with ${todaySubscriptions.length} users starting today, creating/finding shared meeting`);
        
        // Create or get today's meeting for all family members at once
        try {
          const allUserIds = todaySubscriptions.map(sub => sub.userId);
          sharedTodayMeeting = await manageMeeting({
            date: today.toISOString().split('T')[0],
            userIds: allUserIds,
            operation: 'getOrCreate',
            syncFromCalendar: true
          });
          console.log(`Created/found shared meeting ${sharedTodayMeeting.id} for ${allUserIds.length} family members`);
        } catch (meetingError) {
          console.error(`Error creating shared meeting for family plan:`, meetingError);
        }
      }
    }
    
    await Promise.all(updatedSubs.map(async (subscription) => {
      // Send welcome email
      await sendWelcomeEmail({
        recipient: {
          name: `${subscription.user.firstName} ${subscription.user.lastName}`,
          email: subscription.user.email
        },
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: parseFloat(subscription.price.toString()),
        paymentId: subscription.paymentRef || undefined
      });
      
      // Send meeting invite if subscription starts today (using new messaging service)
      const subscriptionStartDate = new Date(subscription.startDate);
      subscriptionStartDate.setHours(0, 0, 0, 0);
      
      if (subscriptionStartDate.getTime() === today.getTime()) {
        try {
          console.log(`Subscription starts today for ${subscription.user.email}, sending immediate invite`);
          
          // Use shared meeting for family plans, or create individual meeting for single plans
          let todayMeeting = sharedTodayMeeting;
          if (!todayMeeting) {
            // Add user to today's meeting (this will create if doesn't exist)
            todayMeeting = await manageMeeting({
              date: today.toISOString().split('T')[0],
              userIds: [subscription.userId],
              operation: 'getOrCreate',
              syncFromCalendar: true
            });
          }
          
          if (todayMeeting && todayMeeting.meetingLink) {
            const inviteSent = await sendImmediateInviteViaMessaging({
              recipient: {
                name: `${subscription.user.firstName} ${subscription.user.lastName}`,
                email: subscription.user.email
              },
              meetingTitle: todayMeeting.meetingTitle || "GOALETE Club Session - Today",
              meetingDescription: todayMeeting.meetingDesc || "Join us for today's GOALETE Club session to learn how to achieve any goal in life.",
              meetingLink: todayMeeting.meetingLink,
              startTime: todayMeeting.startTime,
              endTime: todayMeeting.endTime,
              platform: todayMeeting.platform === "zoom" ? "Zoom" : "Google Meet",
              hostLink: todayMeeting.zoomStartUrl || undefined
            });
            
            if (inviteSent) {
              console.log(`Successfully sent immediate invite to ${subscription.user.email}`);
            } else {
              console.error(`Failed to send immediate invite to ${subscription.user.email}`);
            }
          } else {
            console.log(`No meeting available for today, skipping immediate invite for ${subscription.user.email}`);
          }
        } catch (inviteError) {
          console.error(`Error sending immediate invite to ${subscription.user.email}:`, inviteError);
          // Don't fail the entire transaction for invite errors
        }
      }
    }));
    // Send admin notification
    if (updatedSubs.length > 1) {
      // Family plan: send both users and subscription IDs
      await sendFamilyAdminNotificationEmail({
        users: updatedSubs.map(sub => ({
          id: sub.user.id,
          firstName: sub.user.firstName,
          lastName: sub.user.lastName,
          email: sub.user.email,
          phone: sub.user.phone,
          source: sub.user.source,
          referenceName: sub.user.referenceName || undefined,
          subscriptionId: sub.id
        })),
        planType: updatedSubs[0].planType,
        startDate: updatedSubs[0].startDate,
        endDate: updatedSubs[0].endDate,
        amount: updatedSubs.reduce((sum, sub) => sum + parseFloat(sub.price.toString()), 0),
        paymentId: updatedSubs[0].paymentRef || undefined
      });
    } else {
      // Single plan: send as before
      const subscription = updatedSubs[0];
      await sendAdminNotificationEmail({
        user: {
          id: subscription.user.id,
          firstName: subscription.user.firstName,
          lastName: subscription.user.lastName,
          email: subscription.user.email,
          phone: subscription.user.phone,
          source: subscription.user.source,
          referenceName: subscription.user.referenceName || undefined
        },
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: parseFloat(subscription.price.toString()),
        paymentId: subscription.paymentRef || undefined
      });
    }
    return NextResponse.json({ subscriptions: updatedSubs }, { status: 200 });
  } catch (error) {
    console.error("Error in payment processing:", error);
    return NextResponse.json({ message: "Failed to update subscription", error: String(error) }, { status: 500 });
  }
}

// Delete subscription on payment failure
export async function DELETE(request: NextRequest) {
  try {    
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    if (!orderId)
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    
    // Use deleteMany to handle family plans with multiple subscriptions
    const deleteResult = await prisma.subscription.deleteMany({ where: { orderId } });
    return NextResponse.json({ message: `Deleted ${deleteResult.count} subscription(s)` }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete subscription", details: error }, { status: 500 });
  }
}