import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();
  const adminPasscode = process.env.ADMIN_PASSCODE;

  if (passcode === adminPasscode) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json(
      { message: "Invalid passcode" },
      { status: 401 }
    );
  }
}
