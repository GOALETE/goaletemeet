import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { createMeetingWithUsers } from '@/lib/meetingLink';

// Schema for creating meetings
const createMeetingSchema = z.object({
  dates: z.array(z.string()),
  platform: z.enum(["google-meet", "zoom"]),
  startTime: z.string(), // Format: "HH:MM" in 24-hour format
  duration: z.number().min(15).max(240), // Duration in minutes
  meetingTitle: z.string().optional(),
  meetingDesc: z.string().optional(),
});

// Schema for getting meetings
const getMeetingsSchema = z.object({
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  platform: z.enum(["google-meet", "zoom", "all"]).optional().default("all"),
});

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

    const body = await request.json();
    const parsed = createMeetingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        message: "Invalid input", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { dates, platform, startTime, duration, meetingTitle, meetingDesc } = parsed.data;
    
    // Create meetings for each date
    const createdMeetings = [];
    for (const dateStr of dates) {
      // Use the new robust meeting creation logic
      const meeting = await createMeetingWithUsers({
        platform,
        date: dateStr,
        startTime,
        duration,
        userIds: [], // No users for admin-created meetings by default
        meetingTitle,
        meetingDesc
      });
      createdMeetings.push(meeting);
    }
    
    return NextResponse.json({ 
      message: "Meetings created successfully", 
      meetings: createdMeetings 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating meetings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

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

    // Parse query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const platform = url.searchParams.get("platform") || "all";
    
    // Build the where clause
    const where: any = {};
    
    if (startDate) {
      where.meetingDate = {
        ...(where.meetingDate || {}),
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      where.meetingDate = {
        ...(where.meetingDate || {}),
        lte: new Date(endDate)
      };
    }
    
    if (platform && platform !== "all") {
      where.platform = platform;
    }
    
    // Get the meetings
    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: {
        meetingDate: 'asc'
      }
    });
    
    // Convert UTC times to IST for front-end display
    const meetingsWithISTTime = meetings.map(meeting => {
      const startTimeIST = new Date(meeting.startTime);
      startTimeIST.setUTCHours(startTimeIST.getUTCHours() + 5, startTimeIST.getUTCMinutes() + 30);
      
      const endTimeIST = new Date(meeting.endTime);
      endTimeIST.setUTCHours(endTimeIST.getUTCHours() + 5, endTimeIST.getUTCMinutes() + 30);
      
      return {
        ...meeting,
        startTimeIST: startTimeIST.toISOString(),
        endTimeIST: endTimeIST.toISOString()
      };
    });
    
    return NextResponse.json({ meetings: meetingsWithISTTime });
    
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
