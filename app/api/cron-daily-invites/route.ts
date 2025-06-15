import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMeetingInvite } from "@/lib/email";
import { getOrCreateDailyMeetingLink } from "@/lib/subscription";
import { InviteResult, MeetingWithUsers } from "@/types/meeting";
import { z } from "zod";

// Validation schema for request parameters (if any)
const requestParamsSchema = z.object({
  apiKey: z.string().optional(),
  testMode: z.boolean().optional()
});

// This function will be triggered by a CRON job (e.g., using Vercel Cron)
export async function GET(request: NextRequest) {
  // Start tracking metrics for this job
  const jobStartTime = Date.now();
  const metrics = {
    invitesSent: 0,
    invitesFailed: 0,
    totalDuration: 0,
    errors: [] as string[]
  };

  try {
    // Validate request parameters if any
    const params = requestParamsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!params.success) {
      return NextResponse.json({ 
        success: false,
        message: "Invalid request parameters",
        details: params.error.flatten(),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Check API key if provided and required
    const apiKey = params.data.apiKey;
    const expectedApiKey = process.env.CRON_API_KEY;
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.warn("Unauthorized cron job attempt with invalid API key");
      return NextResponse.json({ 
        success: false,
        message: "Unauthorized access",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Get current date in IST
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`Running daily invite cron job for ${today.toISOString().split('T')[0]}`);
    
    // Get or create today's meeting with retry
    let todayMeeting: MeetingWithUsers | null = null;
    try {
      todayMeeting = await getOrCreateDailyMeetingLink();
    } catch (meetingError) {
      const errorMessage = meetingError instanceof Error ? meetingError.message : String(meetingError);
      console.error("Failed to create or get meeting:", { error: errorMessage });
      metrics.errors.push(`Meeting creation failed: ${errorMessage}`);
      
      return NextResponse.json({ 
        success: false,
        message: "Failed to get or create meeting for today",
        error: errorMessage,
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }

    if (!todayMeeting) {
      const errorMessage = "Failed to get or create meeting for today";
      console.error(errorMessage);
      metrics.errors.push(errorMessage);
      
      return NextResponse.json({ 
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }
    
    if (!todayMeeting.meetingLink) {
      const errorMessage = "Today's meeting has no valid meeting link";
      console.error(errorMessage);
      metrics.errors.push(errorMessage);
      
      return NextResponse.json({ 
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }
    
    console.log(`Using meeting for today: ${todayMeeting.id} with platform ${todayMeeting.platform}`);
    
    // Find all active subscriptions that:
    // 1. Have already started (startDate <= today)
    // 2. Haven't ended yet (endDate >= today)
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "active",
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        user: true
      }
    });

    console.log(`Found ${activeSubscriptions.length} active subscriptions for today`);
    
    if (activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active subscriptions found for today",
        timestamp: new Date().toISOString(),
        invitesSent: []
      }, { status: 200 });
    }    // Use the meeting details
    const meetingLink = todayMeeting.meetingLink;
    const platform = todayMeeting.platform;
    const meetingTitle = todayMeeting.meetingTitle || "GOALETE Club Daily Session";
    const meetingDesc = todayMeeting.meetingDesc || "Join us for today's GOALETE Club session to learn how to achieve any goal in life.";
    
    // Get meeting time settings from environment variables or use meeting time if available
    const meetingStartTime = todayMeeting.startTime || (() => {
      const defaultTime = process.env.DEFAULT_MEETING_TIME || "21:00"; // format: "HH:MM"
      const [hours, minutes] = defaultTime.split(':').map(Number);
      const startTime = new Date(today);
      startTime.setHours(hours || 21, minutes || 0, 0, 0);
      return startTime;
    })();
    
    const meetingEndTime = todayMeeting.endTime || (() => {
      const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || "60"); // minutes
      const endTime = new Date(meetingStartTime);
      endTime.setMinutes(meetingStartTime.getMinutes() + defaultDuration);
      return endTime;
    })();

    // Process each subscription and send invites with enhanced error handling
    const results: InviteResult[] = [];
    
    // Track job progress
    let processedCount = 0;
    const totalSubscriptions = activeSubscriptions.length;
    
    for (const subscription of activeSubscriptions) {
      processedCount++;
      const startTime = Date.now();
      const userEmail = subscription.user.email;
      
      try {
        console.log(`Processing invite ${processedCount}/${totalSubscriptions} for user ${userEmail}`);
        
        // Send calendar invite with retry mechanism from the email library
        const success = await sendMeetingInvite({
          recipient: {
            name: `${subscription.user.firstName} ${subscription.user.lastName}`,
            email: userEmail
          },
          meetingTitle,
          meetingDescription: meetingDesc,
          meetingLink,
          startTime: meetingStartTime,
          endTime: meetingEndTime,
          platform: platform === "zoom" ? "Zoom" : "Google Meet",
          hostLink: todayMeeting.zoomStartUrl || undefined
        });
        
        if (!success) {
          throw new Error(`Email sending failed after retries for ${userEmail}`);
        }
        
        metrics.invitesSent++;
        
        // Return the subscription info for the response
        results.push({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          email: userEmail,
          planType: subscription.planType,
          sentAt: new Date().toISOString(),
          status: "sent",
          meetingLink
        });
        
        console.log(`Successfully sent invite to ${userEmail} (${processedCount}/${totalSubscriptions})`);
      } catch (error) {
        metrics.invitesFailed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        
        console.error(`Failed to send invite to ${userEmail}:`, {
          error: errorMessage,
          stack,
          subscriptionId: subscription.id,
          userId: subscription.userId,
          timestamp: new Date().toISOString()
        });
        
        metrics.errors.push(`${userEmail}: ${errorMessage}`);
        
        results.push({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          email: userEmail,
          status: "failed",
          error: errorMessage
        });
      }
      
      // Log processing time for this subscription
      const processingTime = Date.now() - startTime;
      console.log(`Processing time for ${userEmail}: ${processingTime}ms`);
    }

    // Calculate job metrics
    metrics.totalDuration = Date.now() - jobStartTime;
    
    // Count success and failures
    const successful = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;
    
    console.log(`Sent ${successful} invites successfully, ${failed} failed, total duration: ${metrics.totalDuration}ms`);

    // Return the results
    return NextResponse.json({
      success: true,
      message: `Sent ${successful} invites successfully, ${failed} failed`,
      timestamp: new Date().toISOString(),
      metrics: {
        duration: metrics.totalDuration,
        successRate: totalSubscriptions > 0 ? (successful / totalSubscriptions) * 100 : 0
      },
      meetingDetails: {
        id: todayMeeting.id,
        date: today.toISOString().split('T')[0],
        platform,
        startTime: meetingStartTime.toISOString(),
        endTime: meetingEndTime.toISOString(),
        title: meetingTitle
      },
      invitesSent: results
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    metrics.totalDuration = Date.now() - jobStartTime;
    
    console.error("Error in daily invite cron job:", {
      error: errorMessage,
      stack,
      metrics,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: false,
      message: "Failed to process daily invites",
      error: errorMessage,
      metrics: {
        duration: metrics.totalDuration,
        invitesSent: metrics.invitesSent,
        invitesFailed: metrics.invitesFailed,
        errors: metrics.errors.slice(0, 5) // Only include first 5 errors
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
