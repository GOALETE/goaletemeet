import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { sendMeetingInvite } from "@/lib/email";
import { addUserToMeeting, createMeetingWithUsers } from '@/lib/meetingLink';

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
    const todayStr = today.toISOString().split('T')[0];
    let todayMeeting = await prisma.meeting.findFirst({
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

    // If no meeting exists for today, create one and attach this user
    if (!todayMeeting) {
      const defaultPlatform = process.env.DEFAULT_MEETING_PLATFORM || "google-meet";
      const defaultTime = process.env.DEFAULT_MEETING_TIME || "21:00";
      const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || "60");
      todayMeeting = await createMeetingWithUsers({
        platform: defaultPlatform as 'google-meet' | 'zoom',
        date: todayStr,
        startTime: defaultTime,
        duration: defaultDuration,
        userIds: [userId],
        meetingTitle: "GOALETE Club Daily Session",
        meetingDesc: "Join us for a GOALETE Club session to learn how to achieve any goal in life."
      });
    } else {
      // Attach this user to the meeting if not already attached
      await addUserToMeeting(todayMeeting.id, userId);
    }

    // Refresh meeting details
    const meeting = await prisma.meeting.findUnique({ where: { id: todayMeeting.id } });
    const meetingLink = meeting?.meetingLink;
    const platform = meeting?.platform;
    const meetingStartTime = meeting?.startTime;
    const meetingEndTime = meeting?.endTime;
    const meetingTitle = meeting?.meetingTitle;
    const meetingDesc = meeting?.meetingDesc || "Join us for a GOALETE Club session to learn how to achieve any goal in life.";    if (!meetingLink) {
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
      startTime: meetingStartTime || new Date(),
      endTime: meetingEndTime || new Date(),
      platform: platform === "zoom" ? "Zoom" : "Google Meet"
    });

    // Return success response
    return NextResponse.json({ 
      message: "Meeting invite sent successfully",
      details: {
        email: subscription.user.email,
        startDate: subscription.startDate,
        meetingPlatform: platform,
        meetingTime: meetingStartTime ? meetingStartTime.toISOString() : null,
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
