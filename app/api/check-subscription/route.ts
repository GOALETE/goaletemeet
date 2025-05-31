import { NextRequest, NextResponse } from "next/server";
import { canUserSubscribe } from "@/lib/subscription";
import { z } from "zod";

// Define schema for request validation
const subscriptionCheckSchema = z.object({
  email: z.string().email(),
  planType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscriptionCheckSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        message: "Invalid input", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }
    
    const { email, planType, startDate, endDate } = parsed.data;
    
    // Convert string dates to Date objects if provided
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;
    
    // Check if user can subscribe, possibly with dates and plan type
    const subscriptionStatus = await canUserSubscribe(
      email,
      planType,
      startDateObj,
      endDateObj
    );
    
    return NextResponse.json({
      canSubscribe: subscriptionStatus.canSubscribe,
      message: subscriptionStatus.reason || "User can subscribe",
      subscriptionDetails: subscriptionStatus.subscriptionDetails 
        ? {
            planType: subscriptionStatus.subscriptionDetails.planType,
            startDate: subscriptionStatus.subscriptionDetails.startDate,
            endDate: subscriptionStatus.subscriptionDetails.endDate
          } 
        : null
    }, { status: 200 });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return NextResponse.json({ 
      message: "Failed to check subscription status", 
      error: String(error) 
    }, { status: 500 });
  }
}
