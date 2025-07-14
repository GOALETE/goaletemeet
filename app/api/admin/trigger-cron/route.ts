import { NextRequest, NextResponse } from "next/server";

/**
 * Admin API to manually trigger the daily cron job
 * This is useful for testing and manual execution of the daily invite process
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    if (token !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
    }

    // Get the base URL for making internal API calls
    const baseUrl = request.nextUrl.origin;
    
    // Call the cron job API internally
    const cronResponse = await fetch(`${baseUrl}/api/cron-daily-invites`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Internal-Admin-Trigger'
      }
    });

    // Check if the response is HTML (404 page)
    const contentType = cronResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Cron API returned non-JSON response:', await cronResponse.text());
      return NextResponse.json({
        success: false,
        message: "Cron API endpoint not found or returned invalid response",
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const cronData = await cronResponse.json();

    if (!cronResponse.ok) {
      return NextResponse.json({
        success: false,
        message: "Failed to trigger cron job",
        error: cronData,
        timestamp: new Date().toISOString()
      }, { status: cronResponse.status });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully triggered daily cron job",
      cronResult: cronData,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error triggering manual cron job:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to trigger cron job",
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Admin cron trigger endpoint",
    description: "Use POST method to manually trigger the daily cron job",
    timestamp: new Date().toISOString()
  });
}
