import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMeetingInvite } from "@/lib/email";
import { getOrCreateDailyMeetingLink } from "@/lib/subscription";

// This function will be triggered by a CRON job (e.g., using Vercel Cron)
export async function GET(request: NextRequest) {
  try {    // Get current date in IST
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);// Get or create today's meeting
    const todayMeeting = await getOrCreateDailyMeetingLink();

    if (!todayMeeting) {
      return NextResponse.json({ message: "Failed to get or create meeting for today" }, { status: 500 });
    }
    
    console.log(`Using meeting for today: ${todayMeeting.meetingLink}`);
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

    console.log(`Found ${activeSubscriptions.length} active subscriptions for today`);    // Use the meeting details
    const meetingLink = todayMeeting.meetingLink;
    const platform = todayMeeting.platform;

    // Get meeting time settings from environment variables
    const defaultTime = process.env.DEFAULT_MEETING_TIME || "21:00"; // format: "HH:MM"
    const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || "60"); // minutes
    
    // Parse default time from HH:MM format
    const [hours, minutes] = defaultTime.split(':').map(Number);
    
    // Calculate meeting time for today using environment variables
    const meetingStartTime = new Date(today);
    meetingStartTime.setHours(hours || 21, minutes || 0, 0, 0);
    
    const meetingEndTime = new Date(meetingStartTime);
    meetingEndTime.setMinutes(meetingStartTime.getMinutes() + defaultDuration); // Use duration from env vars

    // Process each subscription and send invites
    const results = await Promise.all(
      activeSubscriptions.map(async (subscription) => {
        try {
          // Send calendar invite
          await sendMeetingInvite({
            recipient: {
              name: `${subscription.user.firstName} ${subscription.user.lastName}`,
              email: subscription.user.email
            },
            meetingTitle: "GOALETE Club Daily Session",
            meetingDescription: "Join us for today's GOALETE Club session to learn how to achieve any goal in life.",
            meetingLink,
            startTime: meetingStartTime,
            endTime: meetingEndTime,
            platform: platform === "zoom" ? "Zoom" : "Google Meet"
          });
          
          // Return the subscription info for the response
          return {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            email: subscription.user.email,
            planType: subscription.planType,
            sentAt: new Date().toISOString(),
            status: "sent",
            meetingLink
          };
        } catch (error) {
          console.error(`Failed to send invite to ${subscription.user.email}:`, error);
          return {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            email: subscription.user.email,
            status: "failed",
            error: String(error)
          };
        }
      })
    );

    const successCount = results.filter(r => r.status === "sent").length;    return NextResponse.json({ 
      message: `Successfully sent ${successCount} out of ${results.length} meeting invites`,
      todayMeeting,
      invitesSent: results
    }, { status: 200 });
  } catch (error) {
    console.error("Error processing daily meeting invites:", error);
    return NextResponse.json({ 
      message: "Failed to process daily meeting invites", 
      error: String(error) 
    }, { status: 500 });
  }
}
