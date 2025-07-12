import { NextRequest, NextResponse } from 'next/server';
import { createMeeting } from '@/lib/meetingLink';
import { isAuthenticated } from '@/lib/googleAuth';

/**
 * POST /api/google/test-meeting
 * Create a test meeting to verify service account integration
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Google service account is configured
    const authenticated = isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Calendar service account not configured. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.'
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      date = new Date().toISOString().split('T')[0], // Default to today
      startTime = '21:00', 
      duration = 60,
      platform = 'google-meet',
      meetingTitle = 'GOALETE Test Meeting - Service Account',
      meetingDesc = 'Test meeting created using service account authentication'
    } = body;

    console.log(`Creating test meeting for ${date} at ${startTime} using service account`);

    const meeting = await createMeeting({
      platform: platform as 'google-meet' | 'zoom',
      date,
      startTime,
      duration,
      meetingTitle,
      meetingDesc
    });

    return NextResponse.json({
      success: true,
      message: 'Test meeting created successfully using service account',
      meeting: {
        id: meeting.id,
        date: meeting.meetingDate,
        platform: meeting.platform,
        meetingLink: meeting.meetingLink,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        title: meeting.meetingTitle,
        description: meeting.meetingDesc,
        googleEventId: meeting.googleEventId,
        authMethod: 'oauth2'
      }
    });
  } catch (error) {
    console.error('Error creating test meeting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create test meeting'
      },
      { status: 500 }
    );
  }
}
