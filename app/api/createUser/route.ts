import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Create or fetch user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Upsert user (create if not exists, else return existing)
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        source: data.source,
        referenceName: data.reference,
        // subscriptions will be empty by default
      },
    });
    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to register user", details: error },
      { status: 500 }
    );
  }
}

// Add subscriptionId to user's subscriptions array
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.userId || !data.subscriptionId) {
      return NextResponse.json({ error: "userId and subscriptionId required" }, { status: 400 });
    }
    // Connect subscription to user
    const user = await prisma.user.update({
      where: { id: data.userId },
      data: {
        subscriptions: { connect: { id: data.subscriptionId } },
      },
    });
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update user subscriptions", details: error },
      { status: 500 }
    );
  }
}
