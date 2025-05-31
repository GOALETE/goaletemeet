import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMeetingInvite } from "@/lib/email";

// This function will be triggered by a CRON job (e.g., using Vercel Cron)
export async function GET(request: NextRequest) {
  try {
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get meeting settings to determine platform
    const meetingSettings = await prisma.meetingSetting.findFirst({
      where: { id: 1 }
    });

    if (!meetingSettings) {
      return NextResponse.json({ message: "Meeting settings not found" }, { status: 404 });
    }    // Check if we already have a meeting link for today
    const existingLink = await prisma.dailyMeetingLink.findFirst({
      where: {
        meetingDate: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    // If no link exists for today, create one
    let dailyMeetingLink;
    
    if (!existingLink) {
      // Generate a new meeting link based on the platform
      let meetingLink;
      const platform = meetingSettings.platform;
      
      if (platform === "zoom") {
        // Use the default Zoom link or generate a new one if you have Zoom API integration
        meetingLink = meetingSettings.zoomLink || "https://zoom.us/j/yourdefaultlink";
      } else {
        // Use the default Google Meet link or generate a new one
        meetingLink = meetingSettings.meetLink || "https://meet.google.com/yourdefaultlink";
      }
      
      // Create the daily meeting link record using Prisma client
      // @ts-ignore - Ignoring TypeScript error until Prisma types are fully updated
      dailyMeetingLink = await prisma.dailyMeetingLink.create({
        data: {
          meetingDate: today,
          meetingLink,
          platform,
          meetingSettingId: meetingSettings.id
        }
      });
      
      console.log(`Created new meeting link for today: ${meetingLink}`);
    } else {
      dailyMeetingLink = existingLink;
      console.log(`Using existing meeting link for today: ${existingLink.meetingLink}`);
    }
    
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

    // Use the meeting link from DailyMeetingLink
    const meetingLink = dailyMeetingLink.meetingLink;
    const platform = dailyMeetingLink.platform;

    // Calculate meeting time for today (8:00 PM / 20:00)
    const meetingStartTime = new Date(today);
    meetingStartTime.setHours(20, 0, 0, 0);
    
    const meetingEndTime = new Date(meetingStartTime);
    meetingEndTime.setHours(21, 0, 0, 0); // 1 hour duration

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

    const successCount = results.filter(r => r.status === "sent").length;

    return NextResponse.json({ 
      message: `Successfully sent ${successCount} out of ${results.length} meeting invites`,
      dailyMeetingLink,
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
