import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PLAN_TYPES } from "@/lib/pricing";
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
    
    // Base where clause for subscriptions - include admin subscriptions regardless of date
    const dateWhereClause = {
      OR: [
        // Regular subscriptions within date range
        {
          AND: [
            {
              paymentStatus: {
                notIn: ['admin-added', 'admin-created'] // Exclude admin subscriptions from date filtering
              }
            },
            {
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
            }
          ]
        },
        // Always include admin subscriptions regardless of date
        {
          paymentStatus: {
            in: ['admin-added', 'admin-created']
          }
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
              in: ['completed', 'paid', 'success', 'admin-added', 'admin-created']
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
    // First, let's see all payment statuses and calculate total revenue including all subscriptions
    const allRevenue = subscriptions.reduce((sum, sub) => sum + ((sub as any).price || 0), 0);
    
    const revenue = subscriptions
      .filter(sub => {
        // More inclusive payment status logic - exclude only explicitly failed/cancelled/pending statuses
        // Include both admin-added and admin-created subscriptions in revenue calculation
        const isInvalidPayment = sub.paymentStatus === 'failed' || 
                                sub.paymentStatus === 'cancelled' || 
                                sub.paymentStatus === 'canceled' ||
                                sub.paymentStatus === 'pending' ||
                                sub.paymentStatus === 'initiated';
        const isValidPayment = !isInvalidPayment;
        console.log(`Subscription ${sub.id}: paymentStatus='${sub.paymentStatus}', price=${(sub as any).price}, isValidPayment=${isValidPayment}`);
        return isValidPayment;
      })
      .reduce((sum, sub) => sum + ((sub as any).price || 0), 0);
    
    console.log('Total revenue from all subscriptions:', allRevenue);
    console.log('Total revenue from valid payments:', revenue);
    console.log('Total subscriptions found:', subscriptions.length);
    console.log('Payment statuses found:', [...new Set(subscriptions.map(s => s.paymentStatus))]);
    console.log('Prices found:', subscriptions.map(s => (s as any).price));
    
    // Use the revenue from valid payments
    const finalRevenue = revenue;
    console.log('Final revenue used:', finalRevenue);
    
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
    const subscriptionsByPlan: Record<string, number> = {
      [PLAN_TYPES.DAILY]: 0,
      [PLAN_TYPES.MONTHLY]: 0,
      [PLAN_TYPES.UNLIMITED]: 0
    };
    const revenueByPlan: Record<string, number> = {
      [PLAN_TYPES.DAILY]: 0,
      [PLAN_TYPES.MONTHLY]: 0,
      [PLAN_TYPES.UNLIMITED]: 0
    };
    
    subscriptions.forEach(sub => {
      // Normalize plan type
      const planType = sub.planType.toLowerCase();
      
      // Count by plan - split family-monthly into 2 monthly entries
      if (planType === PLAN_TYPES.DAILY || planType === PLAN_TYPES.DAILY) {
        subscriptionsByPlan[PLAN_TYPES.DAILY]++;
      } else if (planType === PLAN_TYPES.MONTHLY) {
        subscriptionsByPlan[PLAN_TYPES.MONTHLY]++;
      } else if (planType === 'family-monthly' || planType === 'monthlyfamily' || planType === PLAN_TYPES.COMBO_PLAN) {
        // Split family-monthly into 2 monthly entries
        subscriptionsByPlan[PLAN_TYPES.MONTHLY] += 2;
      } else if (planType === PLAN_TYPES.UNLIMITED) {
        subscriptionsByPlan[PLAN_TYPES.UNLIMITED]++;
      }
      
      // Revenue by plan (use inclusive payment status logic - include both admin statuses)
      const isInvalidPayment = sub.paymentStatus === 'failed' || 
                              sub.paymentStatus === 'cancelled' || 
                              sub.paymentStatus === 'canceled' ||
                              sub.paymentStatus === 'pending' ||
                              sub.paymentStatus === 'initiated';
      const isValidPayment = !isInvalidPayment;
      
      if (isValidPayment) {
        if (planType === PLAN_TYPES.DAILY || planType === PLAN_TYPES.DAILY) {
          revenueByPlan[PLAN_TYPES.DAILY] += (sub as any).price || 0;
        } else if (planType === PLAN_TYPES.MONTHLY) {
          revenueByPlan[PLAN_TYPES.MONTHLY] += (sub as any).price || 0;
        } else if (planType === 'family-monthly' || planType === 'monthlyfamily' || planType === PLAN_TYPES.COMBO_PLAN) {
          // For family-monthly, add the revenue to monthly (since it represents 2 monthly subscriptions)
          revenueByPlan[PLAN_TYPES.MONTHLY] += (sub as any).price || 0;
        } else if (planType === PLAN_TYPES.UNLIMITED) {
          revenueByPlan[PLAN_TYPES.UNLIMITED] += (sub as any).price || 0;
        }
      }
    });
    
    // Generate daily data for charts
    const allDays: string[] = [];
    let currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      allDays.push(format(currentDay, 'yyyy-MM-dd'));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    // Revenue by day (use inclusive payment status logic)
    const revenueByDay = allDays.map(day => {
      const dayRevenue = subscriptions
        .filter(sub => {
          // Include both admin-added and admin-created subscriptions in daily revenue calculation
          const isInvalidPayment = sub.paymentStatus === 'failed' || 
                                  sub.paymentStatus === 'cancelled' || 
                                  sub.paymentStatus === 'canceled' ||
                                  sub.paymentStatus === 'pending' ||
                                  sub.paymentStatus === 'initiated';
          const isValidPayment = !isInvalidPayment;
          return isSameDay(sub.startDate, parseISO(day)) && isValidPayment;
        })
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
      revenue: finalRevenue,
      planStats,
      totalRevenue: finalRevenue,
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
