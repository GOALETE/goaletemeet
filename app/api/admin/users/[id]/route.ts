import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/users/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { grantSuperUser, createInfiniteSubscription } = data;

    // First, update the user role if needed
    if (grantSuperUser) {
      await prisma.user.update({
        where: { id: params.id },
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
          userId: params.id,
          planType: 'UNLIMITED',
          status: 'active',
          paymentStatus: 'completed',
          startDate,
          endDate,
          duration: 36500, // ~100 years in days
          price: 0,
          orderId: `admin-created-${Date.now()}`
        }
      });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete the user
    await prisma.user.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}