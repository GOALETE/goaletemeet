import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { sendMeetingInvite } from "@/lib/email";

// Define schema for request validation
const inviteSchema = z.object({
  subscriptionId: z.string().min(1),
  userId: z.string().min(1),
  isImmediate: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        message: "Invalid input", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { subscriptionId, userId, isImmediate } = parsed.data;

    // Get subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true }
    });

    if (!subscription) {
      return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
    }

    // Get meeting settings
    const meetingSettings = await prisma.meetingSetting.findFirst({
      where: { id: 1 } // Assuming you have a default meeting setting
    });

    if (!meetingSettings) {
      return NextResponse.json({ message: "Meeting settings not found" }, { status: 404 });
    }    // Get the meeting link based on platform
    const platform = meetingSettings.platform;
    const meetingLink = platform === "zoom" 
      ? meetingSettings.zoomLink 
      : meetingSettings.meetLink;

    if (!meetingLink) {
      return NextResponse.json({ message: "Meeting link not available" }, { status: 400 });
    }

    // Calculate meeting start and end times
    const meetingDate = new Date(subscription.startDate);
    // Set meeting time to 8:00 PM (20:00)
    meetingDate.setHours(20, 0, 0, 0);
    
    const meetingEndDate = new Date(meetingDate);
    // Set meeting duration to 1 hour
    meetingEndDate.setHours(meetingEndDate.getHours() + 1);
    
    // Send the meeting invite with default values
    await sendMeetingInvite({
      recipient: {
        name: `${subscription.user.firstName} ${subscription.user.lastName}`,
        email: subscription.user.email
      },
      meetingTitle: "GOALETE Club Session", // Default title 
      meetingDescription: "Join us for a GOALETE Club session to learn how to achieve any goal in life.",
      meetingLink,
      startTime: meetingDate,
      endTime: meetingEndDate,
      platform: platform === "zoom" ? "Zoom" : "Google Meet"
    });

    // Return success response
    return NextResponse.json({ 
      message: "Meeting invite sent successfully",
      details: {
        email: subscription.user.email,
        startDate: subscription.startDate,
        meetingPlatform: meetingSettings.platform,
        meetingTime: meetingDate.toISOString(),
        isImmediate
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error sending meeting invite:", error);
    return NextResponse.json({ 
      message: "Failed to send meeting invite", 
      error: String(error) 
    }, { status: 500 });
  }
}
