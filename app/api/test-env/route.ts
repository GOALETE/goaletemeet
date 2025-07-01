import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasAdminPasscode: !!process.env.ADMIN_PASSCODE,
    adminPasscodeLength: process.env.ADMIN_PASSCODE?.length || 0,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    envKeys: Object.keys(process.env).filter(key => 
      key.includes('ADMIN') || 
      key.includes('DATABASE') || 
      key.includes('RAZORPAY') ||
      key.includes('EMAIL')
    )
  });
}
