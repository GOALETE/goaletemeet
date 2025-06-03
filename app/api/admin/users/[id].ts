import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { formatUserWithSubscriptions } from "../../../../lib/admin";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    if (!await verifyAdmin(req)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = params.id;

    // Fetch user with all subscriptions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: { startDate: 'desc' }
        }
      }
    });

    // Return 404 if user not found
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Format user for admin
    const formattedUser = formatUserWithSubscriptions(user as any);

    // Return response
    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    if (!await verifyAdmin(req)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = params.id;
    const data = await req.json();

    // Fetch user to check if exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Return 404 if user not found
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Handle granting superuser status
    if (data.grantSuperUser) {
      // Update user role to superuser
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'superuser' }
      });

      // Create infinite subscription if requested
      if (data.createInfiniteSubscription) {
        // Calculate a date 100 years in the future (effectively infinite)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 100);

        // Create the infinite subscription
        await prisma.subscription.create({
          data: {
            userId,
            planType: 'Infinite',
            startDate,
            endDate,
            status: 'active',
            paymentStatus: 'completed',
            orderId: `infinite-${Date.now()}`,
            duration: 36500, // 100 years in days
            price: 0 // Free infinite subscription
          }
        });
      }

      // Fetch updated user with subscriptions
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            orderBy: { startDate: 'desc' }
          }
        }
      });

      // Return success response
      return NextResponse.json({
        message: "Successfully granted superuser status",
        user: formatUserWithSubscriptions(updatedUser as any)
      });
    }

    // Handle other user updates if needed
    // (Implement additional update logic here as required)

    return NextResponse.json(
      { message: "No updates performed" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500 }
    );
  }
}
