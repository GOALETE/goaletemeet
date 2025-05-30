import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: Automate sending invites via email/Google Calendar/Zoom
  console.log("Cron job triggered for daily invites");

  return NextResponse.json({ success: true });
}