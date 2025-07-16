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

// PATCH /api/admin/user - Update user, includes handling unlimited access status and user edits
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
    const { userId, grantUnlimited, revokeUnlimited, createInfiniteSubscription, firstName, lastName, email, phone, source } = data;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Handle user information updates
    if (firstName !== undefined || lastName !== undefined || email !== undefined || phone !== undefined || source !== undefined) {
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email.toLowerCase();
      if (phone !== undefined) updateData.phone = phone;
      if (source !== undefined) updateData.source = source;

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    // Update the user role if needed
    if (grantUnlimited) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' }
      });
    } else if (revokeUnlimited) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'USER' }
      });
      
      // Also deactivate any unlimited subscriptions when revoking unlimited access status
      await prisma.subscription.updateMany({
        where: { 
          userId: userId,
          planType: 'UNLIMITED',
          status: 'active'
        },
        data: { status: 'cancelled' }
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

// DELETE /api/admin/user - Delete a user
export async function DELETE(request: NextRequest) {
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: true,
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user's subscriptions first (due to foreign key constraints)
    await prisma.subscription.deleteMany({
      where: { userId: userId }
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        email: user.email,
        subscriptionCount: user._count.subscriptions
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
