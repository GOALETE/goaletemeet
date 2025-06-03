import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatUserForAdmin } from "@/lib/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    // Verify admin authorization (simplified here, implement proper auth)
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Format user data for admin view
    const formattedUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      source: user.source,
      createdAt: user.createdAt.toISOString(),
      role: user.role,
      subscriptions: user.subscriptions.map(sub => ({
        id: sub.id,
        planType: sub.planType,
        startDate: sub.startDate.toISOString(),
        endDate: sub.endDate.toISOString(),
        paymentRef: sub.paymentRef || null,
        status: sub.status,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        orderId: sub.orderId,
        paymentStatus: sub.paymentStatus,
        duration: sub.duration,
        price: sub.price
      }))
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      { message: "Error fetching user details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const data = await req.json();
    
    // Verify admin authorization (simplified here, implement proper auth)
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Update user role if provided
    if (data.grantSuperUser) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'superuser' }
      });

      // Check if we need to create a subscription
      if (data.createInfiniteSubscription) {
        // Create a far-future date (100 years from now) for "infinite" subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 100); // 100 years in the future

        // Create a special subscription with infinite duration
        await prisma.subscription.create({
          data: {
            userId: userId,
            planType: 'superuser',
            startDate,
            endDate,
            status: 'active',
            paymentStatus: 'completed',
            orderId: `SUPERUSER-${userId}-${Date.now()}`,
            price: 0,
            duration: -1, // Use -1 to signify infinite
          }
        });
      }

      return NextResponse.json({ 
        message: "Successfully granted superuser status",
        user: {
          ...user,
          role: 'superuser'
        } 
      });
    }

    return NextResponse.json({ message: "No changes requested" }, { status: 400 });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: "Error updating user" },
      { status: 500 }
    );
  }
}
