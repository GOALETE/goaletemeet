import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // TODO: Validate payment and update subscription status
  console.log("Payment webhook received:", body);

  return NextResponse.json({ success: true });
}