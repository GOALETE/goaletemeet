import { NextRequest, NextResponse } from "next/server";
import  prisma  from "@/lib/prisma"; // Assume this is your Prisma client setup

// Returns the list of users with active access today
export async function GET(req: NextRequest) {
  const today = new Date();
  const activeSubs = await prisma.subscription.findMany({
    where: {
      status: "active",
      startDate: { lte: today },
      endDate: { gte: today }
    },
    include: { user: true }
  });
  return NextResponse.json({
    users: activeSubs.map((sub: any) => ({
      id: sub.user.id,
      name: `${sub.user.firstName} ${sub.user.lastName}`,
      email: sub.user.email,
      plan: sub.planType,
      start: sub.startDate,
      end: sub.endDate
    }))
  });
}