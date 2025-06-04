import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/users
export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users
export async function POST(request: Request) {
  const data = await request.json();
  try {
    const newUser = await prisma.user.create({
      data,
    });
    return NextResponse.json(newUser);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
