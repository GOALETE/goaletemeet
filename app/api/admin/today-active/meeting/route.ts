import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { getOrCreateDailyMeetingLink } from "../../../../../lib/subscription";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    if (token !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
      // Use the existing function to get or create today's meeting
    const todayMeeting = await getOrCreateDailyMeetingLink();
    
    if (!todayMeeting) {
      return NextResponse.json({ message: "No meeting available for today" }, { status: 404 });
    }

    // Format the meeting time for display
    const formattedMeeting = {
      id: todayMeeting.id,
      meetingDate: todayMeeting.meetingDate.toISOString(),
      platform: todayMeeting.platform,
      meetingLink: todayMeeting.meetingLink,
      startTime: todayMeeting.startTime.toISOString(),
      endTime: todayMeeting.endTime.toISOString(),
      startTimeIST: todayMeeting.startTime.toISOString(),
      endTimeIST: todayMeeting.endTime.toISOString(),
      meetingTitle: todayMeeting.meetingTitle,
      meetingDesc: todayMeeting.meetingDesc,
      googleEventId: todayMeeting.googleEventId || null,
      zoomMeetingId: todayMeeting.zoomMeetingId || null,
      zoomStartUrl: todayMeeting.zoomStartUrl || null
    };

    // Count active users for today
    const activeCount = await prisma.subscription.count({
      where: {
        status: 'active',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    return NextResponse.json({
      meeting: formattedMeeting,
      activeCount
    });
  } catch (error) {
    console.error("Error fetching today's active meeting:", error);
    return NextResponse.json({ message: "Failed to fetch today's meeting" }, { status: 500 });
  }
}
