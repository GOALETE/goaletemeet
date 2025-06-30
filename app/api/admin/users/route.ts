import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatUserForAdmin } from '@/lib/admin';

// GET /api/admin/users
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
    const source = url.searchParams.get('source');
    const search = url.searchParams.get('search');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const startDate = url.searchParams.get('startDate');

    // Build where clause for users
    let whereClauseUser: any = {};
    
    if (search) {
      whereClauseUser.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    if (source && source !== 'all') {
      whereClauseUser.source = source;
    }

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

    if (startDate) {
      const date = new Date(startDate);
      subscriptionWhereClause.startDate = { gte: date };
    }

    // Get users with subscriptions
    const users = await prisma.user.findMany({
      where: {
        ...whereClauseUser,
        ...(Object.keys(subscriptionWhereClause).length > 0 ? {
          subscriptions: {
            some: subscriptionWhereClause
          }
        } : {})
      },
      include: {
        subscriptions: {
          orderBy: { startDate: 'desc' }
        }
      },
      orderBy: {
        [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // Get total count for pagination
    const total = await prisma.user.count({
      where: {
        ...whereClauseUser,
        ...(Object.keys(subscriptionWhereClause).length > 0 ? {
          subscriptions: {
            some: subscriptionWhereClause
          }
        } : {})
      }
    });

    // Format users for admin display
    const formattedUsers = users.map(user => formatUserForAdmin(user as any));

    return NextResponse.json({
      users: formattedUsers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users
export async function POST(request: Request) {
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

    const data = await request.json();
    const newUser = await prisma.user.create({
      data,
    });
    return NextResponse.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
