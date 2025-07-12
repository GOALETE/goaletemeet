import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/user - Get a user by ID via query parameter
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/user - Update user, includes handling superuser status
export async function PATCH(request: NextRequest) {
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
    const { userId, grantSuperUser, createInfiniteSubscription } = data;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // First, update the user role if needed
    if (grantSuperUser) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' }
      });
    }

    // Create an infinite subscription if requested
    if (createInfiniteSubscription) {
      // Set dates far in the future for "infinite" subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 100); // 100 years in the future

      await prisma.subscription.create({
        data: {
          userId: userId,
          planType: 'UNLIMITED',
          status: 'active',
          paymentStatus: 'admin-created',
          startDate,
          endDate,
          duration: 36500, // ~100 years in days
          price: 0,
          orderId: `admin-created-${Date.now()}`
        }
      });
    }

    // Fetch the updated user data with subscriptions
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
