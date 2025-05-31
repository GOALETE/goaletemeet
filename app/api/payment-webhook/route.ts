import { NextRequest, NextResponse } from "next/server";

// Dummy webhook endpoint for future use
export async function POST(request: NextRequest) {
  // TODO: Implement payment webhook logic
  return NextResponse.json({ success: true, message: "Webhook received (dummy)." });
}
