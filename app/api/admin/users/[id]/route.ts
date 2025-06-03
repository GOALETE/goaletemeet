import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { formatUserWithSubscriptions } from "../../../../../lib/admin";

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
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Verify admin authentication
    if (!await verifyAdmin(req)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = context.params.id;

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

    // Format user data with subscription details
    const formattedUser = formatUserWithSubscriptions(user);

    return NextResponse.json({ user: formattedUser });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Verify admin authentication
    if (!await verifyAdmin(req)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = context.params.id;
    const data = await req.json();

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
      if (!updatedUser) {
        return NextResponse.json({
          message: "Successfully granted superuser status, but user data could not be retrieved",
        }, { status: 200 });
      }
      
      return NextResponse.json({
        message: "Successfully granted superuser status",
        user: formatUserWithSubscriptions(updatedUser)
      });
    }

    // Handle regular user updates
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        source: data.source,
        referenceName: data.referenceName
      },
      include: {
        subscriptions: {
          orderBy: { startDate: 'desc' }
        }
      }
    });    
    
    // Format user data with subscription details
    const formattedUser = formatUserWithSubscriptions(updatedUser);

    return NextResponse.json({ 
      message: "User updated successfully",
      user: formattedUser
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Verify admin authentication
    if (!await verifyAdmin(req)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = context.params.id;

    // Delete the user's subscriptions first to avoid foreign key constraints
    await prisma.subscription.deleteMany({
      where: { userId }
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ 
      message: "User and all related subscriptions deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}