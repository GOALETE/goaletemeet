import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserWithSubscriptions } from "@/lib/admin";

// Get a single user with all their subscriptions (for admin detail view)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: { startDate: "desc" }
        }
      }
    });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: formatUserWithSubscriptions(user as any) });
  } catch (error) {
    console.error("Error fetching user detail:", error);
    return NextResponse.json({ message: "Failed to fetch user detail" }, { status: 500 });
  }
}
