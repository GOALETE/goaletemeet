import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Create or fetch user
export async function POST(request: NextRequest) {
  console.log("Received request to create or fetch user");
  // Validate request body
  try {
    // Define schema for user input validation
    console.log("Defining user schema");
    const userSchema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(8),
      source: z.string().min(1),
      reference: z.string().optional(),
    });
    //console.log("Parsing request body");
    const data = await request.json();
    //console.log("Validating user data");
    const parsed = userSchema.safeParse(data);
    // Check if the parsed data is valid
    console.log("Parsed data:", parsed);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    // Upsert user (create if not exists, else return existing)
    console.log("Upserting user in database");
    // Use Prisma to create or update user
    const user = await prisma.user.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        source: parsed.data.source,
        referenceName: parsed.data.reference,
        // subscriptions will be empty by default
      },
    });
    console.log("User upserted successfully:", user);
    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating or fetching user:", error);
    // Handle any errors that occur during the process
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
      return NextResponse.json(
        { error: "userId and subscriptionId required" },
        { status: 400 }
      );
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
