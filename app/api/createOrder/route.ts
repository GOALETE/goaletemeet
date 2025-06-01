import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { canUserSubscribeForDates } from "@/lib/subscription";

const key_id = process.env.RAZORPAY_KEY_ID as string;
const key_secret = process.env.RAZORPAY_KEY_SECRET as string;

if (!key_id || !key_secret) {
    throw new Error("Razorpay keys are missing");
}

const razorpay = new Razorpay({
  key_id: key_id,
  key_secret: key_secret,
});

// Define the schema for order body validation
const orderBodySchema = z.object({
    amount: z.number().positive(),
    currency: z.string().min(1),
    planType: z.string().min(1),
    duration: z.number().positive(),
    startDate: z.string().optional(),
    userId: z.string().min(1)
});

export type OrderBody = z.infer<typeof orderBodySchema>;

// Create order and DB subscription entry
export async function POST(request: NextRequest) {  
  try {
    const body = await request.json();
    const parsed = orderBodySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }    
    const { amount, currency, planType, duration, startDate, userId } = parsed.data;
    
    // Determine start and end dates based on duration
    let subscriptionStartDate: Date = startDate ? new Date(startDate) : new Date();
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
      },
    };
    console.log("options package:", options)

    let order;
    try {
      order = await razorpay.orders.create(options);
      if (!order || !order.id) {
        console.error('Razorpay order creation failed:', order);
        return NextResponse.json({ message: 'Failed to create order with Razorpay', details: order }, { status: 502 });
      }
    } catch (razorpayError) {
      console.error('Error from Razorpay:', razorpayError);
      return NextResponse.json({ message: 'Razorpay order creation error', error: String(razorpayError) }, { status: 502 });
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
        status: "inactive"
    };
    
    // Add duration field - using "as any" to bypass TypeScript errors until Prisma client is properly updated
    data.duration = duration;
    // Add price field (in rupees)
    data.price = Math.round(amount / 100);
    
    const subscription = await prisma.subscription.create({
      data,
    });
    
    return NextResponse.json({ orderId: order.id, subscriptionId: subscription.id }, { status: 201 });
  } catch (error) {
    console.log("Error in createorder:", error)
    return NextResponse.json({ message: "Server Error", error: String(error) }, { status: 500 });
  }
}

// Update subscription after payment success
export async function PATCH(request: NextRequest) {
  try {
    const { subscriptionId, orderId, paymentId, userId, status, paymentStatus } = await request.json();
    if (!subscriptionId || !orderId || !paymentId || !userId || !status) {
      return NextResponse.json({ message: "subscriptionId, orderId, paymentId, userId, and status required" }, { status: 400 });
    }
    
    // Validate paymentStatus
    const validPaymentStatus = paymentStatus || "unknown";
    
    // First check if subscription exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { orderId },
      include: { user: true },
    });
    
    if (!existingSubscription) {
      return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
    }
    
    // Update the subscription with payment details
    const subscription = await prisma.subscription.update({
      where: { orderId },
      data: {
        paymentRef: paymentId,
        paymentStatus: validPaymentStatus,
        status,
      },
      include: {
        user: true
      }
    });
    
    // Only connect to user if status is active and it"s not already connected
    if (subscription && status === "active") {
      // Connect subscription to user
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptions: { connect: { id: subscription.id } },
        },
      });
      
      // Import the email utility
      const { sendWelcomeEmail, sendMeetingInvite } = await import("@/lib/email");
      
      // Send welcome email with subscription details
      await sendWelcomeEmail({
        recipient: {
          name: `${subscription.user.firstName} ${subscription.user.lastName}`,
          email: subscription.user.email
        },
        planType: subscription.planType,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: parseFloat(orderId.split("_")[1]) || 499900 // Use default amount if extraction fails
      });
      
      // Check if the subscription starts today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const subscriptionStartDate = new Date(subscription.startDate);
      subscriptionStartDate.setHours(0, 0, 0, 0);
      
      const isToday = subscriptionStartDate.getTime() === today.getTime();
      
      // If subscription starts today, send meeting invite immediately
      if (isToday) {
        // Get today"s meeting from the Meeting model
        const todayMeeting = await prisma.meeting.findFirst({
          where: {
            meetingDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        });
        
        // If no meeting exists for today, create one
        let meetingLink, platform, meetingStartTime, meetingEndTime;
        
        if (todayMeeting) {
          meetingLink = todayMeeting.meetingLink;
          platform = todayMeeting.platform;
          meetingStartTime = todayMeeting.startTime;
          meetingEndTime = todayMeeting.endTime;
        } else {
          // Get default meeting settings from environment variables
          const defaultPlatform = process.env.DEFAULT_MEETING_PLATFORM || "google-meet";
          const defaultTime = process.env.DEFAULT_MEETING_TIME || "21:00"; // format: "HH:MM"
          const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || "60"); // minutes
          
          // Parse default time from HH:MM format
          const [hours, minutes] = defaultTime.split(':').map(Number);
          
          // Create a default meeting for today
          const newMeeting = await prisma.meeting.create({
            data: {
              meetingDate: today,
              platform: defaultPlatform,
              meetingLink: defaultPlatform === "zoom" 
                ? `https://zoom.us/j/goalete-${Date.now().toString(36)}`
                : `https://meet.google.com/goalete-${Date.now().toString(36)}`,
              startTime: new Date(new Date().setHours(hours || 21, minutes || 0, 0, 0)),
              endTime: new Date(new Date().setHours(hours || 21, minutes || 0, 0, 0).valueOf() + defaultDuration * 60000),
              createdBy: "system",
              isDefault: true,
              meetingDesc: "Join us for a GOALETE Club session to learn how to achieve any goal in life.",
              meetingTitle: "GOALETE Club Daily Session"
            }
          });
          
          meetingLink = newMeeting.meetingLink;
          platform = newMeeting.platform;
          meetingStartTime = newMeeting.startTime;
          meetingEndTime = newMeeting.endTime;
        }
        
        // Send meeting invite if we have meeting details
        if (meetingLink) {
          await sendMeetingInvite({
            recipient: {
              name: `${subscription.user.firstName} ${subscription.user.lastName}`,
              email: subscription.user.email
            },
            meetingTitle: "GOALETE Club Session - Today",
            meetingDescription: "Join us for today's GOALETE Club session to learn how to achieve any goal in life.",
            meetingLink,
            startTime: meetingStartTime,
            endTime: meetingEndTime,
            platform: platform === "zoom" ? "Zoom" : "Google Meet"
          });
        }
      }
    }
    
    return NextResponse.json({ subscription }, { status: 200 });
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
    await prisma.subscription.delete({ where: { orderId } });
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete subscription", details: error }, { status: 500 });
  }
}