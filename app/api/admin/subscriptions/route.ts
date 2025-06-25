import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin } from "@/lib/admin";

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
    const viewType = url.searchParams.get('viewType') || 'all';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');
    
    // Build query conditions
    let whereConditionSubscription: any = {};
    
    if (viewType === 'active' || status === 'active') {
      whereConditionSubscription.status = 'active';
      whereConditionSubscription.paymentStatus = 'completed';
    } else if (status) {
      whereConditionSubscription.status = status;
    }
    
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
    
    // Calculate total revenue from all valid subscriptions
    const totalRevenue = users.reduce((sum, user) => {
      return sum + user.subscriptions.reduce((subSum, sub) => {
        return subSum + ((sub as any).price || 0);
      }, 0);
    }, 0);
      // Get subscription status counts
    const today = new Date();
    const activeSubscriptions = formattedUsers.filter(user => {
      if (!user.start || !user.end) return false;
      const startDate = new Date(user.start);
      const endDate = new Date(user.end);
      return startDate <= today && endDate >= today;
    }).length;
    
    const upcomingSubscriptions = formattedUsers.filter(user => {
      if (!user.start) return false;
      return new Date(user.start) > today;
    }).length;
    
    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length,
      revenue: totalRevenue,
      activeSubscriptions,
      upcomingSubscriptions
    });
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    return NextResponse.json(
      { message: "Failed to fetch subscription data" },
      { status: 500 }
    );
  }
}
