import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

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

    // Get meeting ID from query parameters
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json({ message: "Meeting ID is required" }, { status: 400 });
    }

    // Get meeting with attendees/users
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true
          }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
    }

    // Format attendee data
    const attendees = meeting.users.map((user: any) => ({
      id: user.id,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.email.split('@')[0],
      email: user.email,
      phone: user.phone,
      registeredDate: user.createdAt.toISOString().split('T')[0]
    }));

    return NextResponse.json({
      meetingId: meeting.id,
      meetingTitle: meeting.meetingTitle,
      meetingDate: meeting.meetingDate.toISOString().split('T')[0],
      attendeeCount: attendees.length,
      attendees: attendees
    });

  } catch (error) {
    console.error("Error fetching meeting attendees:", error);
    return NextResponse.json(
      { message: "Failed to fetch meeting attendees" }, 
      { status: 500 }
    );
  }
}
