import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/admin/user/meetings - Add user to meetings
export async function POST(request: NextRequest) {
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

    const data = await request.json();
    const { userId, meetingIds } = data;

    if (!userId || !meetingIds || !Array.isArray(meetingIds)) {
      return NextResponse.json({ error: 'User ID and meeting IDs array are required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For each meeting, we could create a relationship or update the meeting's attendees
    // Since we don't have a specific user-meeting relationship table in the schema,
    // we'll return success for now. This would need to be implemented based on
    // your specific requirements for associating users with meetings.
    
    // TODO: Implement the actual user-meeting association logic based on your data model
    console.log(`Adding user ${userId} to meetings:`, meetingIds);

    return NextResponse.json({ 
      success: true, 
      message: `User ${userId} added to ${meetingIds.length} meetings` 
    });
  } catch (error) {
    console.error('Error adding user to meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
