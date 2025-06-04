import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Use /api/admin/today-active/meeting endpoint instead" });
}
