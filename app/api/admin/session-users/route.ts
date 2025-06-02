import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ message: 'Date is required' }, { status: 400 });
    }
    // Get all users with active subscriptions for the given date
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        startDate: { lte: sessionDate },
        endDate: { gte: sessionDate }
      },
      include: { user: true }
    });
    const users = subscriptions.map(sub => ({
      id: sub.user.id,
      name: `${sub.user.firstName} ${sub.user.lastName}`,
      email: sub.user.email,
      phone: sub.user.phone,
      plan: sub.planType
    }));
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch session users', error: String(error) }, { status: 500 });
  }
}
