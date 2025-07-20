import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, testAuthentication } from '@/lib/googleAuth';

/**
 * GET /api/google/status
 * Check Google service account authentication status
 */
export async function GET() {
  try {
    const authenticated = isAuthenticated();
    
    let testPassed = false;
    if (authenticated) {
      try {
        testPassed = await testAuthentication();
      } catch (error) {
        console.warn('Authentication test failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      authenticated,
      testPassed,
      authMethod: 'service-account',
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL ? process.env.GOOGLE_CLIENT_EMAIL.split('@')[0] + '@***' : null
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check authentication status'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/google/status
 * Service accounts don't support logout like OAuth2
 */
export async function DELETE() {
  return NextResponse.json({
    success: false,
    message: 'Service account authentication cannot be revoked through API. Remove environment variables to disable.'
  }, { status: 400 });
}
