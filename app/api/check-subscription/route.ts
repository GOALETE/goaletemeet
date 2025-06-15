import { NextRequest, NextResponse } from "next/server";
import { canUserSubscribe } from "@/lib/subscription";
import { z } from "zod";

/**
 * API Route: /api/check-subscription
 * 
 * Checks if a user can subscribe to a plan based on their email and optional parameters.
 * This endpoint is used by the registration form and subscription management pages.
 * 
 * Request body:
 * - email: User's email address (required)
 * - planType: Type of plan the user wants to subscribe to (optional)
 * - startDate: Start date of the subscription in ISO format (optional)
 * - endDate: End date of the subscription in ISO format (optional)
 * 
 * Response:
 * - canSubscribe: Boolean indicating if the user can subscribe
 * - message: Explanation of why the user can or cannot subscribe
 * - subscriptionDetails: Details of any existing subscription (if any)
 */

// Define schema for request validation
const subscriptionCheckSchema = z.object({
  email: z.string().email("Valid email address is required"),
  planType: z.string().optional(),
  startDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid date format for startDate. Use ISO format (YYYY-MM-DD)" }
  ),
  endDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid date format for endDate. Use ISO format (YYYY-MM-DD)" }
  )
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate the request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        success: false,
        message: "Invalid JSON in request body", 
        error: String(parseError)
      }, { status: 400 });
    }
    
    const parsed = subscriptionCheckSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false,
        message: "Invalid input", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }
    
    const { email, planType, startDate, endDate } = parsed.data;
    
    // Log the subscription check attempt
    console.log(`Checking subscription for ${email}`, {
      planType: planType || 'not specified',
      startDate: startDate || 'not specified',
      endDate: endDate || 'not specified',
      timestamp: new Date().toISOString()
    });
    
    // Convert string dates to Date objects if provided
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;
    
    // Validate date range if both dates are provided
    if (startDateObj && endDateObj && startDateObj >= endDateObj) {
      return NextResponse.json({
        success: false,
        message: "Invalid date range: start date must be before end date",
        canSubscribe: false
      }, { status: 400 });
    }
    
    // Check if user can subscribe, possibly with dates and plan type
    const subscriptionStatus = await canUserSubscribe(
      email,
      planType,
      startDateObj,
      endDateObj
    );
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      canSubscribe: subscriptionStatus.canSubscribe,
      message: subscriptionStatus.reason || "Available for Subscription",
      subscriptionDetails: subscriptionStatus.subscriptionDetails ? 
        {
          planType: subscriptionStatus.subscriptionDetails.planType,
          startDate: subscriptionStatus.subscriptionDetails.startDate.toISOString(),
          endDate: subscriptionStatus.subscriptionDetails.endDate.toISOString(),
          status: subscriptionStatus.subscriptionDetails.status
        } 
        : null,
      metadata: {
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error("Error checking subscription status:", {
      error: errorMessage,
      stack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: false,
      message: "Failed to check subscription status", 
      error: errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}
