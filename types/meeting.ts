// Types for the Meeting functionality
import { Meeting as PrismaMeeting, User } from '@prisma/client';

// Enhanced Meeting type that includes platform-specific fields
export interface MeetingWithUsers extends PrismaMeeting {
  id: string;
  meetingDate: Date;
  platform: string;
  meetingLink: string;
  startTime: Date;
  endTime: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  meetingDesc?: string | null;
  meetingTitle: string;
  users?: User[];
  googleEventId?: string | null;
  zoomMeetingId?: string | null;
  zoomStartUrl?: string | null;
}

// Response type for the meeting API
export interface MeetingResponse {
  message: string;
  meetings: MeetingWithUsers[];
}

// Response type for the cron job
export interface CronJobResponse {
  message: string;
  todayMeeting: MeetingWithUsers;
  invitesSent: InviteResult[];
}

// Individual invite result
export interface InviteResult {
  userId: string;
  subscriptionId: string;
  email: string;
  planType?: string;
  sentAt?: string;
  status: 'sent' | 'failed';
  error?: string;
  meetingLink?: string;
}
