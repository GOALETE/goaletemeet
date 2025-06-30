import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin, generateCSV } from "@/lib/admin";
import type { Subscription } from "@/generated/prisma";

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
    const planType = url.searchParams.get('planType');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const paymentStatus = url.searchParams.get('paymentStatus');
    const isFullExport = url.searchParams.get('fullExport') === 'true';
    
    // Base query conditions
    let whereConditionUser: any = {};
    let whereConditionSubscription: any = {};
    
    // Add plan type filter if provided
    if (planType && planType !== 'all') {
      whereConditionSubscription.planType = planType;
    }
    
    // Add date range filter if provided
    if (startDate && endDate) {
      whereConditionSubscription.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    // Add status filter if provided
    if (status && status !== 'all') {
      whereConditionSubscription.status = status;
    }
    
    // Add payment status filter if provided
    if (paymentStatus && paymentStatus !== 'all') {
      whereConditionSubscription.paymentStatus = paymentStatus;
    }
    
    // Get users with filters
    const users = await prisma.user.findMany({
      where: whereConditionUser,
      include: {
        subscriptions: {
          where: Object.keys(whereConditionSubscription).length > 0 
            ? whereConditionSubscription 
            : undefined,
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    });
    
    // Format user data for export, including price from the most recent subscription
    const formattedUsers = users
      .filter(user => Object.keys(whereConditionSubscription).length === 0 || user.subscriptions.length > 0)
      .map(user => formatUserForAdmin(user as any));
    
    // Generate CSV
    const csvContent = generateCSV(formattedUsers);
    
    // Set response headers for file download
    const filename = isFullExport 
      ? "goalete-full-export.csv" 
      : "goalete-users-export.csv";
      
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("Error exporting user data:", error);
    return NextResponse.json(
      { message: "Failed to export user data" },
      { status: 500 }
    );
  }
}
