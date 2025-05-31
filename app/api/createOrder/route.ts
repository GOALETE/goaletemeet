import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import { z } from "zod";

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

    const order = await razorpay.orders.create(options);
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
    
    // Add duration field - using 'as any' to bypass TypeScript errors until Prisma client is properly updated
    data.duration = duration;
    
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
    const validPaymentStatus = paymentStatus || 'unknown';
    
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
    });
    
    // Only connect to user if status is active and it's not already connected
    if (subscription && status === "active") {
      // Connect subscription to user
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptions: { connect: { id: subscription.id } },
        },
      });
    }
    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
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