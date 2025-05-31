import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin } from "@/lib/admin";

// Get all users with their current subscription, with pagination, search, sorting, and paymentStatus filter
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const planType = url.searchParams.get('planType');
    const status = url.searchParams.get('status');
    const paymentStatus = url.searchParams.get('paymentStatus');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const source = url.searchParams.get('source');
    const search = url.searchParams.get('search') || '';
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const skip = (page - 1) * pageSize;

    // Base query conditions
    let whereConditionUser: any = {};
    let whereConditionSubscription: any = {};

    // Add source filter if provided
    if (source && source !== 'all') {
      whereConditionUser.source = source;
    }

    // Add search filter
    if (search) {
      whereConditionUser.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add plan type filter if provided
    if (planType && planType !== 'all') {
      whereConditionSubscription.planType = planType;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      whereConditionSubscription.status = status;
    }

    // Add payment status filter if provided
    if (paymentStatus && paymentStatus !== 'all') {
      whereConditionSubscription.paymentStatus = paymentStatus;
    }

    // Add date range filter if provided
    if (startDate && endDate) {
      whereConditionSubscription.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where: whereConditionUser });

    // Get users with their subscriptions
    const users = await prisma.user.findMany({
      where: whereConditionUser,
      include: {
        subscriptions: {
          where: Object.keys(whereConditionSubscription).length > 0 
            ? whereConditionSubscription 
            : undefined,
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Only get the most recent subscription for filtering
        }
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    // Format the data for the frontend, including paymentStatus and price from the most recent subscription
    const formattedUsers = users.map(user => {
      const currentSubscription = user.subscriptions[0];
      return {
        ...formatUserForAdmin(user),
        paymentStatus: currentSubscription?.paymentStatus || null,
        price: (currentSubscription as any)?.price ?? null
      };
    });

    return NextResponse.json({ users: formattedUsers, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
