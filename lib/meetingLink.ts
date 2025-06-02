import prisma from './prisma';

/**
 * Create a meeting link for the given platform, date, and timeslot.
 * @param platform 'google-meet' | 'zoom'
 * @param date ISO date string (YYYY-MM-DD)
 * @param startTime string (HH:MM, 24-hour format)
 * @param duration number (minutes)
 * @returns Promise<string> meeting link
 */
export async function createMeetingLink({
  platform,
  date,
  startTime,
  duration
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number
}): Promise<string> {
  if (platform === 'google-meet') {
    return await google_create_meet({ date, startTime, duration });
  } else if (platform === 'zoom') {
    return await zoom_create_meet({ date, startTime, duration });
  } else {
    throw new Error('Unsupported platform');
  }
}

// Example stub implementations (to be replaced with real API logic)
export async function google_create_meet({ date, startTime, duration }: { date: string, startTime: string, duration: number }): Promise<string> {
  // TODO: Integrate with Google Meet API
  const meetId = Math.random().toString(36).substring(2, 10);
  return `https://meet.google.com/${meetId}`;
}

export async function zoom_create_meet({ date, startTime, duration }: { date: string, startTime: string, duration: number }): Promise<string> {
  // TODO: Integrate with Zoom API
  const zoomId = Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
  return `https://zoom.us/j/${zoomId}`;
}

/**
 * Create a meeting and attach invited users.
 * @param args.platform 'google-meet' | 'zoom'
 * @param args.date ISO date string (YYYY-MM-DD)
 * @param args.startTime string (HH:MM, 24-hour format)
 * @param args.duration number (minutes)
 * @param args.userIds string[] (user IDs to invite)
 * @returns Meeting record
 */
export async function createMeetingWithUsers({
  platform,
  date,
  startTime,
  duration,
  userIds,
  meetingTitle,
  meetingDesc
}: {
  platform: 'google-meet' | 'zoom',
  date: string,
  startTime: string,
  duration: number,
  userIds: string[],
  meetingTitle?: string,
  meetingDesc?: string
}) {
  const meetingLink = await createMeetingLink({ platform, date, startTime, duration });
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDateTime = new Date(`${date}T${startTime}:00+05:30`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + duration);
  const meeting = await prisma.meeting.create({
    data: {
      meetingDate: new Date(date),
      platform,
      meetingLink,
      startTime: startDateTime,
      endTime: endDateTime,
      createdBy: 'admin',
      meetingTitle: meetingTitle || 'GOALETE Club Session',
      meetingDesc: meetingDesc || 'Join us for a GOALETE Club session to learn how to achieve any goal in life.',
      users: {
        connect: userIds.map(id => ({ id }))
      }
    },
    include: { users: true }
  });
  return meeting;
}

/**
 * Add a user to an existing meeting's invited list.
 * @param meetingId string
 * @param userId string
 * @returns Updated meeting
 */
export async function addUserToMeeting(meetingId: string, userId: string) {
  return prisma.meeting.update({
    where: { id: meetingId },
    data: {
      users: {
        connect: { id: userId }
      }
    },
    include: { users: true }
  });
}
