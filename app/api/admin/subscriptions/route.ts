import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const viewType = url.searchParams.get('viewType') || 'all';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    // Build query conditions
    let whereConditionSubscription: any = {
      status: 'active',
      paymentStatus: 'completed'
    };
    
    // Add date filters based on view type
    if (startDate) {
      whereConditionSubscription.startDate = {
        ...(whereConditionSubscription.startDate || {}),
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      whereConditionSubscription.endDate = {
        ...(whereConditionSubscription.endDate || {}),
        lte: new Date(endDate)
      };
    }
    
    // Get users with active subscriptions
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          where: whereConditionSubscription,
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    });
    
    // Format and filter users
    const formattedUsers = users
      .filter(user => user.subscriptions.length > 0)
      .map(user => formatUserForAdmin(user as any));
    
    // Calculate total revenue from successful payments
    const totalRevenue = users.reduce((sum, user) => {
      return sum + user.subscriptions.reduce((subSum, sub) => {
        return subSum + ((sub as any).price || 0);
      }, 0);
    }, 0);
    
    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length,
      revenue: totalRevenue
    });
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    return NextResponse.json(
      { message: "Failed to fetch subscription data" },
      { status: 500 }
    );
  }
}
