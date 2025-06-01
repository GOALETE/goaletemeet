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

    const { subscriptionId, userId, isImmediate } = parsed.data;    // Get subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true }
    });

    if (!subscription) {
      return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
    }

    // Get today's meeting from the Meeting model
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMeeting = await prisma.meeting.findFirst({
      where: {
        meetingDate: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // If no meeting exists for today, create one
    let meetingLink, platform, meetingStartTime, meetingEndTime, meetingTitle, meetingDesc;
    
    if (todayMeeting) {
      meetingLink = todayMeeting.meetingLink;
      platform = todayMeeting.platform;
      meetingStartTime = todayMeeting.startTime;
      meetingEndTime = todayMeeting.endTime;
      meetingTitle = todayMeeting.meetingTitle;
      meetingDesc = todayMeeting.meetingDesc || "Join us for a GOALETE Club session to learn how to achieve any goal in life.";    } else {
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
      meetingTitle = newMeeting.meetingTitle;
      meetingDesc = newMeeting.meetingDesc || "Join us for a GOALETE Club session to learn how to achieve any goal in life.";
    }    if (!meetingLink) {
      return NextResponse.json({ message: "Meeting link not available" }, { status: 400 });
    }

    // Send the meeting invite with meeting details
    await sendMeetingInvite({
      recipient: {
        name: `${subscription.user.firstName} ${subscription.user.lastName}`,
        email: subscription.user.email
      },
      meetingTitle: meetingTitle || "GOALETE Club Session", 
      meetingDescription: meetingDesc || "Join us for a GOALETE Club session to learn how to achieve any goal in life.",
      meetingLink,
      startTime: meetingStartTime,
      endTime: meetingEndTime,
      platform: platform === "zoom" ? "Zoom" : "Google Meet"
    });

    // Return success response
    return NextResponse.json({ 
      message: "Meeting invite sent successfully",
      details: {
        email: subscription.user.email,
        startDate: subscription.startDate,
        meetingPlatform: platform,
        meetingTime: meetingStartTime.toISOString(),
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
