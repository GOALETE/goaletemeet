import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin, calculateSubscriptionStats } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    // Get all users with their subscriptions
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
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

    // Revenue and payment status breakdown
    const allSubscriptions = await prisma.subscription.findMany();
    const paymentStats = allSubscriptions.reduce((acc, sub) => {
      const status = sub.paymentStatus;
      if (!acc[status]) {
        acc[status] = { count: 0, totalPrice: 0, totalDuration: 0 };
      }
      acc[status].count++;
      acc[status].totalPrice += (sub as any).price || 0;
      acc[status].totalDuration += sub.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; totalPrice: number; totalDuration: number }>);
    const revenue = allSubscriptions
      .filter(sub => sub.paymentStatus === 'completed')
      .reduce((sum, sub) => sum + ((sub as any).price || 0), 0);
    // Plan type breakdown
    const planStats = await prisma.subscription.groupBy({
      by: ['planType'],
      _count: { _all: true },
    });

    return NextResponse.json({
      stats,
      paymentStats,
      revenue,
      planStats,
    });
  } catch (error) {
    console.error("Error calculating statistics:", error);
    return NextResponse.json(
      { message: "Failed to calculate statistics" },
      { status: 500 }
    );
  }
}
