import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/admin/subscriptions - Returns individual subscription records
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

    console.log('Subscriptions API: Starting request processing');

    const url = new URL(req.url);
    const planType = url.searchParams.get('planType');
    const status = url.searchParams.get('status');
    const paymentStatus = url.searchParams.get('paymentStatus');
    const search = url.searchParams.get('search');
    const sortBy = url.searchParams.get('sortBy') || 'startDate';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const viewType = url.searchParams.get('viewType') || 'all';

    console.log('Subscriptions API: Query params:', {
      planType, status, paymentStatus, search, sortBy, sortOrder, 
      page, pageSize, startDate, endDate, viewType
    });

    // Build where clause for subscriptions
    let subscriptionWhereClause: any = {};
    
    if (planType && planType !== 'all') {
      subscriptionWhereClause.planType = planType;
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        const today = new Date();
        subscriptionWhereClause.status = 'active';
        subscriptionWhereClause.startDate = { lte: today };
        subscriptionWhereClause.endDate = { gte: today };
      } else {
        subscriptionWhereClause.status = status;
      }
    }

    if (paymentStatus && paymentStatus !== 'all') {
      subscriptionWhereClause.paymentStatus = paymentStatus;
    }

    if (startDate) {
      try {
        const startDateObj = new Date(startDate);
        if (subscriptionWhereClause.startDate && typeof subscriptionWhereClause.startDate === 'object') {
          // Merge with existing startDate filter
          subscriptionWhereClause.startDate = { 
            ...subscriptionWhereClause.startDate,
            gte: startDateObj 
          };
        } else {
          subscriptionWhereClause.startDate = { gte: startDateObj };
        }
      } catch (error) {
        console.error('Invalid startDate format:', startDate);
        return NextResponse.json({ error: 'Invalid startDate format' }, { status: 400 });
      }
    }

    if (endDate) {
      try {
        const endDateObj = new Date(endDate);
        if (subscriptionWhereClause.endDate && typeof subscriptionWhereClause.endDate === 'object') {
          // Merge with existing endDate filter
          subscriptionWhereClause.endDate = { 
            ...subscriptionWhereClause.endDate,
            lte: endDateObj 
          };
        } else {
          subscriptionWhereClause.endDate = { lte: endDateObj };
        }
      } catch (error) {
        console.error('Invalid endDate format:', endDate);
        return NextResponse.json({ error: 'Invalid endDate format' }, { status: 400 });
      }
    }

    console.log('Subscriptions API: Initial where clause:', subscriptionWhereClause);

    // Handle legacy viewType parameter for backward compatibility
    if (viewType === 'active') {
      const today = new Date();
      subscriptionWhereClause.status = 'active';
      // Only add date filters if they don't already exist
      if (!subscriptionWhereClause.startDate) {
        subscriptionWhereClause.startDate = { lte: today };
      }
      if (!subscriptionWhereClause.endDate) {
        subscriptionWhereClause.endDate = { gte: today };
      }
      subscriptionWhereClause.paymentStatus = 'completed';
    }

    // User search filter
    let userWhereClause: any = {};
    if (search) {
      userWhereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    // Build the complete where clause
    const whereClause = {
      ...subscriptionWhereClause,
      ...(Object.keys(userWhereClause).length > 0 ? {
        user: userWhereClause
      } : {})
    };

    // Determine sort field mapping
    const sortFieldMap: { [key: string]: any } = {
      'userName': { user: { firstName: sortOrder } },
      'userEmail': { user: { email: sortOrder } },
      'createdAt': { user: { createdAt: sortOrder } },
      'startDate': { startDate: sortOrder },
      'endDate': { endDate: sortOrder },
      'planType': { planType: sortOrder },
      'status': { status: sortOrder },
      'paymentStatus': { paymentStatus: sortOrder },
      'price': { price: sortOrder }
    };

    const orderBy = sortFieldMap[sortBy] || { [sortBy]: sortOrder };

    console.log('Subscriptions API: OrderBy clause:', orderBy);

    console.log('Subscriptions API: Final where clause:', whereClause);

    // Get subscriptions with user data
    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            source: true,
            referenceName: true,
            createdAt: true,
            role: true
          }
        }
      },
      orderBy: orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    console.log('Subscriptions API: Found subscriptions:', subscriptions.length);

    // Get total count for pagination
    const total = await prisma.subscription.count({
      where: whereClause
    });

    console.log('Subscriptions API: Total count:', total);

    // Format subscriptions for admin display (each subscription as individual row)
    const formattedSubscriptions = subscriptions.map(subscription => {
      try {
        return {
          id: subscription.id,
          userId: subscription.user.id,
          userName: `${subscription.user.firstName || ''} ${subscription.user.lastName || ''}`.trim(),
          userEmail: subscription.user.email,
          userPhone: subscription.user.phone,
          userSource: subscription.user.source,
          userReference: subscription.user.referenceName,
          userCreatedAt: subscription.user.createdAt.toISOString(),
          userRole: subscription.user.role,
          planType: subscription.planType,
          startDate: subscription.startDate.toISOString(),
          endDate: subscription.endDate.toISOString(),
          status: subscription.status,
          paymentStatus: subscription.paymentStatus,
          price: subscription.price || 0,
          orderId: subscription.orderId,
          duration: subscription.duration,
          createdAt: subscription.createdAt.toISOString(),
          // Calculate current status based on dates
          currentStatus: (() => {
            const today = new Date();
            const start = new Date(subscription.startDate);
            const end = new Date(subscription.endDate);
            
            if (subscription.status !== 'active') return subscription.status;
            if (start <= today && end >= today) return 'active';
            if (start > today) return 'upcoming';
            if (end < today) return 'expired';
            return subscription.status;
          })()
        };
      } catch (error) {
        console.error('Error formatting subscription:', subscription.id, error);
        return null;
      }
    }).filter(Boolean); // Remove any null entries

    console.log('Subscriptions API: Formatted subscriptions:', formattedSubscriptions.length);

    // Calculate summary statistics for backward compatibility
    const activeCount = formattedSubscriptions.filter(sub => sub && sub.currentStatus === 'active').length;
    const upcomingCount = formattedSubscriptions.filter(sub => sub && sub.currentStatus === 'upcoming').length;
    const totalRevenue = formattedSubscriptions.reduce((sum, sub) => sum + (sub ? (sub.price || 0) : 0), 0);

    console.log('Subscriptions API: Returning response with', {
      subscriptionsCount: formattedSubscriptions.length,
      total,
      activeCount,
      upcomingCount,
      totalRevenue
    });

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
      users: formattedSubscriptions, // For backward compatibility
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        active: activeCount,
        upcoming: upcomingCount,
        total: formattedSubscriptions.length
      },
      revenue: totalRevenue,
      activeSubscriptions: activeCount,
      upcomingSubscriptions: upcomingCount
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      subscriptions: [],
      users: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      stats: { active: 0, upcoming: 0, total: 0 },
      revenue: 0,
      activeSubscriptions: 0,
      upcomingSubscriptions: 0
    }, { status: 500 });
  }
}
