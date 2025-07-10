import { NextRequest, NextResponse } from 'next/server';
import { getCronJobStatus, getCronJobStatusMessage } from '@/lib/cronConfig';

/**
 * Cron Job Status API Endpoint
 * 
 * GET /api/cron-status - Check current cron job configuration and status
 * 
 * This endpoint provides information about cron job feature flags and current
 * configuration without executing any cron jobs.
 */

export async function GET(request: NextRequest) {
  try {
    // Get current cron job status
    const status = getCronJobStatus();
    const statusMessage = getCronJobStatusMessage();

    return NextResponse.json({
      success: true,
      message: statusMessage,
      status: status,
      endpoints: {
        dailyInvites: '/api/cron-daily-invites',
        status: '/api/cron-status'
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error("Error in cron status endpoint:", {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: false,
      message: "Failed to get cron job status",
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Update cron job configuration (admin only)
 * POST /api/cron-status - Update cron job feature flags
 */
export async function POST(request: NextRequest) {
  try {
    // This would typically require admin authentication
    // For now, just return the current status
    
    const body = await request.json();
    const { action } = body;

    if (action === 'toggle') {
      return NextResponse.json({
        success: false,
        message: "Dynamic cron job configuration updates not implemented. Please update environment variables and restart the application.",
        currentStatus: getCronJobStatus(),
        timestamp: new Date().toISOString()
      }, { status: 501 });
    }

    return NextResponse.json({
      success: false,
      message: "Invalid action. Supported actions: 'toggle'",
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to update cron job configuration",
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
