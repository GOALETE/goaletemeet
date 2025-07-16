import { NextRequest, NextResponse } from "next/server";
import { canUserSubscribe } from "@/lib/subscription";
import { z } from "zod";

/**
 * API Route: /api/check-subscription
 * 
 * Checks if user(s) can subscribe to a plan based on their email(s) and optional parameters.
 * This endpoint is used by the registration form and subscription management pages.
 * 
 * Request body:
 * - email: Single user's email address (optional, for backward compatibility)
 * - emails: Array of user email addresses (optional, for family plans)
 * - planType: Type of plan the user wants to subscribe to (optional)
 * - startDate: Start date of the subscription in ISO format (optional)
 * - endDate: End date of the subscription in ISO format (optional)
 * 
 * Note: Either 'email' or 'emails' must be provided
 * 
 * Response:
 * - canSubscribe: Boolean indicating if all users can subscribe
 * - message: Explanation of why the user(s) can or cannot subscribe
 * - results: Array of individual results for each email checked
 * - subscriptionDetails: Details of any existing subscription (if any, for single user)
 */

// Define schema for request validation
const subscriptionCheckSchema = z.object({
  // Accept either single email or array of emails for family plans
  email: z.string().email("Valid email address is required").optional(),
  emails: z.array(z.string().email("Valid email address is required")).optional(),
  planType: z.string().optional(),
  startDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid date format for startDate. Use ISO format (YYYY-MM-DD)" }
  ),
  endDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid date format for endDate. Use ISO format (YYYY-MM-DD)" }
  )
}).refine(
  data => data.email || (data.emails && data.emails.length > 0),
  { message: "Either email or emails array must be provided" }
);

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
    
    const { email, emails, planType, startDate, endDate } = parsed.data;
    
    // Normalize emails to always work with an array
    const emailsToCheck = emails || (email ? [email] : []);
    
    // Log the subscription check attempt
    console.log(`Checking subscription for ${emailsToCheck.join(', ')}`, {
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
    const results = [];
    const conflictingUsers = [];
    
    for (const userEmail of emailsToCheck) {
      const subscriptionStatus = await canUserSubscribe(
        userEmail,
        planType,
        startDateObj,
        endDateObj
      );
      
      results.push({
        email: userEmail,
        ...subscriptionStatus
      });
      
      if (!subscriptionStatus.canSubscribe) {
        conflictingUsers.push({
          email: userEmail,
          reason: subscriptionStatus.reason
        });
      }
    }
    
    // Determine overall result
    const allCanSubscribe = results.every(result => result.canSubscribe);
    
    let message: string;
    if (allCanSubscribe) {
      if (emailsToCheck.length === 1) {
        message = "Available for Subscription";
      } else {
        message = "Both users are available for subscription";
      }
    } else {
      if (emailsToCheck.length === 1) {
        message = conflictingUsers[0].reason || "Cannot subscribe";
      } else {
        const conflictingEmails = conflictingUsers.map(u => u.email).join(', ');
        if (conflictingUsers.length === emailsToCheck.length) {
          message = `Both users have subscription conflicts: ${conflictingUsers.map(u => `${u.email} - ${u.reason}`).join('; ')}`;
        } else {
          message = `Some users have subscription conflicts: ${conflictingEmails}`;
        }
      }
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      canSubscribe: allCanSubscribe,
      message: message,
      results: results,
      subscriptionDetails: results.length === 1 && results[0].subscriptionDetails ? 
        {
          planType: results[0].subscriptionDetails.planType,
          startDate: results[0].subscriptionDetails.startDate.toISOString(),
          endDate: results[0].subscriptionDetails.endDate.toISOString(),
          status: results[0].subscriptionDetails.status
        } 
        : null,
      metadata: {
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        emailsChecked: emailsToCheck.length
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
