import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin, generateCSV } from "@/lib/admin";
import { Subscription } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const planType = url.searchParams.get('planType');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
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
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="goalete-users-export.csv"`
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
