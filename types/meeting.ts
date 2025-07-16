// Types for the Meeting functionality
import type { User } from '@/generated/prisma';

// Meeting type matching the Prisma schema, plus user details
export interface MeetingWithUsers {
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
  meetingDesc: string | null;
  meetingTitle: string;
  users?: User[];
  googleEventId: string | null;
  zoomMeetingId: string | null;
  zoomStartUrl: string | null;
}

// Response type for the meeting API
export interface MeetingResponse {
  message: string;
  meetings: MeetingWithUsers[];
}
