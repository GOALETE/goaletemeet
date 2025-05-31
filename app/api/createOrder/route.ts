import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Create order and DB subscription entry
export async function POST(request: NextRequest) {
  const orderSchema = z.object({
    amount: z.number().int().positive(),
    currency: z.string().min(1),
    planType: z.string().min(1),
    sessionDate: z.string().optional(),
    monthStart: z.string().optional(),
    userId: z.string().uuid(),
  });
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return NextResponse.json({ message: "Razorpay keys are missing" }, { status: 500 });
  }

  const razorpay = new Razorpay({ key_id, key_secret });

  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { amount, currency, planType, sessionDate, monthStart, userId } = parsed.data;
    const options = {
      amount,
      currency: currency || "INR",
      receipt: `receipt#${Date.now()}`,
      notes: {
        description: "Payment for subscription",
        plan_type: planType,
        user_id: userId,
      },
    };
    const order = await razorpay.orders.create(options);
    // Create subscription entry in DB
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planType,
        sessionDate: sessionDate ? new Date(sessionDate) : null,
        startDate: monthStart ? new Date(monthStart) : new Date(),
        endDate:
          planType === "monthly" && monthStart
            ? new Date(new Date(monthStart).setMonth(new Date(monthStart).getMonth() + 1))
            : new Date(),
        orderId: order.id,
        paymentRef: "",
        paymentStatus: "pending",
        status: "pending",
      },
    });
    return NextResponse.json({ orderId: order.id, subscriptionId: subscription.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error: String(error) }, { status: 500 });
  }
}

// Update subscription after payment success
export async function PATCH(request: NextRequest) {
  try {
    const { orderId, paymentId, userId, status } = await request.json();
    if (!orderId || !paymentId || !userId || !status) {
      return NextResponse.json({ message: "orderId, paymentId, userId, and status required" }, { status: 400 });
    }
    // Find the subscription by orderId (orderId is unique)
    const subscription = await prisma.subscription.update({
      where: { orderId },
      data: {
        paymentRef: paymentId,
        paymentStatus: status === "active" ? "approved" : "failed",
        status,
      },
    });
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