import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { formatUserForAdmin, generateCSV } from "../../../../lib/admin";

// Verify admin authentication
async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  
  const providedPasscode = authHeader.replace("Bearer ", "");
  const adminPasscode = process.env.ADMIN_PASSCODE;
  
  return providedPasscode === adminPasscode;
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    if (!await verifyAdmin(req)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const all = url.searchParams.get('all') === 'true';
    const search = url.searchParams.get('search') || '';
    const plan = url.searchParams.get('plan') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const source = url.searchParams.get('source') || 'all';
    const paymentStatus = url.searchParams.get('paymentStatus') || 'all';
    const dateRange = url.searchParams.get('dateRange') || 'all';
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const showExpiringSoon = url.searchParams.get('showExpiringSoon') === 'true';

    // Build user query
    let userWhereCondition: any = {};
    let subscriptionWhereCondition: any = {};

    // Add search filter
    if (search) {
      userWhereCondition.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add source filter
    if (source !== 'all') {
      userWhereCondition.source = source;
    }

    // Add subscription plan filter
    if (plan !== 'all') {
      subscriptionWhereCondition.planType = plan;
    }

    // Add subscription status filter
    if (status !== 'all') {
      subscriptionWhereCondition.status = status;
    }

    // Add payment status filter
    if (paymentStatus !== 'all') {
      subscriptionWhereCondition.paymentStatus = paymentStatus;
    }

    // Add date filters
    if (dateRange !== 'all') {
      const today = new Date();
      const dates: any = {};

      if (dateRange === 'today') {
        dates.startDate = new Date(today.setHours(0, 0, 0, 0));
        dates.endDate = new Date(today.setHours(23, 59, 59, 999));
      } else if (dateRange === 'thisWeek') {
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
        dates.startDate = new Date(firstDay.setHours(0, 0, 0, 0));
        const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        dates.endDate = new Date(lastDay.setHours(23, 59, 59, 999));
      } else if (dateRange === 'thisMonth') {
        dates.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        dates.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (dateRange === 'custom' && startDate && endDate) {
        dates.startDate = new Date(startDate);
        dates.endDate = new Date(endDate);
        dates.endDate.setHours(23, 59, 59, 999);
      }

      if (dates.startDate && dates.endDate) {
        subscriptionWhereCondition.OR = [
          { startDate: { gte: dates.startDate, lte: dates.endDate } },
          { endDate: { gte: dates.startDate, lte: dates.endDate } }
        ];
      }
    }

    // Add expiring soon filter
    if (showExpiringSoon) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      subscriptionWhereCondition.status = 'active';
      subscriptionWhereCondition.endDate = {
        gte: today,
        lte: nextWeek
      };
    }

    // Fetch users (all or filtered)
    const users = await prisma.user.findMany({
      where: all ? {} : userWhereCondition,
      include: {
        subscriptions: {
          where: all ? {} : (Object.keys(subscriptionWhereCondition).length > 0 ? subscriptionWhereCondition : undefined),
          orderBy: { startDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format users for admin and CSV
    const formattedUsers = users.map(user => formatUserForAdmin(user as any));
    
    // Generate CSV content
    const csvContent = generateCSV(formattedUsers);
    
    // Return CSV data
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error("Error exporting users:", error);
    return NextResponse.json(
      { message: "Failed to export users" },
      { status: 500 }
    );
  }
}
