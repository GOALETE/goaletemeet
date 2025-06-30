import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    if (token !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
    }

    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const planType = url.searchParams.get('planType');
    
    // Set default date to today if not provided
    const filterDate = date ? new Date(date) : new Date();
    
    // Base query conditions
    let whereCondition: any = {
      startDate: { lte: filterDate },
      endDate: { gte: filterDate },
      status: 'active'
    };
    
    // Add plan type filter if provided
    if (planType) {
      whereCondition.planType = planType;
    }
    
    // Count active subscriptions for the given date and plan type
    const count = await prisma.subscription.count({
      where: whereCondition
    });
    
    return NextResponse.json({ count, date: filterDate.toISOString(), planType: planType || 'all' });
  } catch (error) {
    console.error("Error counting users:", error);
    return NextResponse.json(
      { message: "Failed to count users" },
      { status: 500 }
    );
  }
}
