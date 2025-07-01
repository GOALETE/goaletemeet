import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin, calculateSubscriptionStats } from "@/lib/admin";
import { format, subDays, parseISO, isSameDay } from "date-fns";

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

    // Parse query parameters for date range and payment status
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const paymentStatusParam = url.searchParams.get("paymentStatus") || 'all';
    
    // Default to last 30 days if not specified
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : subDays(new Date(), 30);
    
    // Make sure dates are at beginning/end of day for accurate calculations
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);
    
    // Base where clause for subscriptions
    const dateWhereClause = {
      OR: [
        // Subscriptions that start within the date range
        {
          startDate: {
            gte: startDate,
            lte: endDate
          }
        },
        // Subscriptions that end within the date range
        {
          endDate: {
            gte: startDate,
            lte: endDate
          }
        },
        // Subscriptions that span the date range
        {
          AND: [
            {
              startDate: {
                lte: startDate
              }
            },
            {
              endDate: {
                gte: endDate
              }
            }
          ]
        }
      ]
    };
    
    // Add payment status filter if needed
    let subscriptionWhereClause: any = dateWhereClause;
    
    if (paymentStatusParam === 'paid') {
      subscriptionWhereClause = {
        AND: [
          dateWhereClause,
          {
            paymentStatus: {
              in: ['completed', 'paid', 'success']
            }
          }
        ]
      };
    } else if (paymentStatusParam === 'pending') {
      subscriptionWhereClause = {
        AND: [
          dateWhereClause,
          {
            paymentStatus: {
              in: ['pending', 'initiated', 'failed']
            }
          }
        ]
      };
    }
    
    // Get all users with their subscriptions
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          where: subscriptionWhereClause,
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    });

    // Format users for admin
    const formattedUsers = users.map(user => formatUserForAdmin(user as any));
    
    // Calculate statistics
    const stats = calculateSubscriptionStats(formattedUsers);
    
    // Get all subscriptions for detailed analytics
    const subscriptions = await prisma.subscription.findMany({
      where: subscriptionWhereClause
    });
    
    // Revenue and payment status breakdown
    const paymentStats = subscriptions.reduce((acc, sub) => {
      const status = sub.paymentStatus;
      if (!acc[status]) {
        acc[status] = { count: 0, totalPrice: 0, totalDuration: 0 };
      }
      acc[status].count++;
      acc[status].totalPrice += (sub as any).price || 0;
      acc[status].totalDuration += sub.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; totalPrice: number; totalDuration: number }>);
    
    // Calculate revenue from all successful paid statuses only
    const revenue = subscriptions
      .filter(sub => sub.paymentStatus === 'completed' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'success')
      .reduce((sum, sub) => sum + ((sub as any).price || 0), 0);
    
    // Plan type breakdown
    const planStats = await prisma.subscription.groupBy({
      by: ['planType'],
      _count: { _all: true },
      where: subscriptionWhereClause
    });
    
    // Advanced analytics for the dashboard
    const today = new Date();
    
    // Calculate active subscriptions (current) - subscriptions that are currently valid
    const activeSubscriptions = subscriptions.filter(sub => {
      const startDate = new Date(sub.startDate);
      const endDate = new Date(sub.endDate);
      return startDate <= today && endDate >= today && sub.status === 'active';
    }).length;
    
    // Total subscriptions count
    const totalSubscriptions = subscriptions.length;
    
    // Expired subscriptions
    const expiredSubscriptions = subscriptions.filter(sub => {
      const endDate = new Date(sub.endDate);
      return endDate < today || sub.status === 'expired';
    }).length;
    
    // Upcoming subscriptions (start in the future)
    const upcomingSubscriptions = subscriptions.filter(sub => {
      const startDate = new Date(sub.startDate);
      return startDate > today && sub.status === 'active';
    }).length;
    
    // Recalculate stats using the correct logic
    const correctedStats = {
      total: totalSubscriptions,
      active: activeSubscriptions,
      expired: expiredSubscriptions,
      upcoming: upcomingSubscriptions
    };
    
    // Group subscriptions by plan type for earnings analytics
    const subscriptionsByPlan: Record<string, number> = {};
    const revenueByPlan: Record<string, number> = {};
    
    subscriptions.forEach(sub => {
      // Count by plan
      if (!subscriptionsByPlan[sub.planType]) {
        subscriptionsByPlan[sub.planType] = 0;
      }
      subscriptionsByPlan[sub.planType]++;
      
      // Revenue by plan (only count paid subscriptions for revenue)
      if (sub.paymentStatus === 'completed' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'success') {
        if (!revenueByPlan[sub.planType]) {
          revenueByPlan[sub.planType] = 0;
        }
        revenueByPlan[sub.planType] += (sub as any).price || 0;
      }
    });
    
    // Generate daily data for charts
    const allDays: string[] = [];
    let currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      allDays.push(format(currentDay, 'yyyy-MM-dd'));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    // Revenue by day (only count paid subscriptions)
    const revenueByDay = allDays.map(day => {
      const dayRevenue = subscriptions
        .filter(sub => 
          isSameDay(sub.startDate, parseISO(day)) && 
          (sub.paymentStatus === 'completed' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'success')
        )
        .reduce((sum, sub) => sum + ((sub as any).price || 0), 0);
      
      return {
        date: day,
        revenue: dayRevenue
      };
    });
    
    // Subscriptions by day
    const subscriptionsByDay = allDays.map(day => {
      const count = subscriptions.filter(sub => 
        isSameDay(sub.startDate, parseISO(day))
      ).length;
      
      return {
        date: day,
        count
      };
    });

    return NextResponse.json({
      stats: correctedStats,
      paymentStats,
      revenue,
      planStats,
      totalRevenue: revenue,
      activeSubscriptions,
      totalSubscriptions,
      expiredSubscriptions,
      upcomingSubscriptions,
      subscriptionsByPlan,
      revenueByPlan,
      revenueByDay,
      subscriptionsByDay
    });
  } catch (error) {
    console.error("Error calculating statistics:", error);
    return NextResponse.json(
      { message: "Failed to calculate statistics" },
      { status: 500 }
    );
  }
}
