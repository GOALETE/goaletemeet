import prisma from './prisma';
import { createCompleteMeeting } from './meetingLink';
import { Meeting } from '@prisma/client';
import { MeetingWithUsers } from '../types/meeting';

// Format date helper function for DD:MM:YY format in IST timezone
const formatDateDDMMYY = (date: Date): string => {
  // Convert to IST timezone (UTC+5:30)
  const options: Intl.DateTimeFormatOptions = { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  };
  
  const formatter = new Intl.DateTimeFormat('en-IN', options);
  return formatter.format(date).replace(/\-/g, '/');
};

/**
 * Check if a user has an active subscription
 * @param email User's email address
 * @returns Object containing subscription status and details
 */
export async function checkActiveSubscription(email: string) {
  try {
    // Get current date in IST
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: {
          where: {
            status: "active",
            endDate: {
              gte: today // End date is in the future
            }
          },
          orderBy: {
            endDate: 'desc' // Get the subscription that ends last
          },
          take: 1 // Only need the most recent active subscription
        }
      }
    });
    
    if (!user) {
      return {
        hasActiveSubscription: false,
        message: "User not found",
        subscriptionDetails: null
      };
    }
    
    // Fix: Type assertion to ensure subscriptions property exists
    const userWithSubs = user as typeof user & { subscriptions: any[] };
    const hasActiveSubscription = userWithSubs.subscriptions.length > 0;
      return {
      hasActiveSubscription,
      message: hasActiveSubscription 
        ? `User has an active subscription ending on ${formatDateDDMMYY(userWithSubs.subscriptions[0].endDate)}`
        : "User has no active subscriptions",
      subscriptionDetails: hasActiveSubscription ? userWithSubs.subscriptions[0] : null
    };
  } catch (error) {
    console.error("Error checking subscription status:", error);
    throw error;
  }
}

/**
 * Check if a user can subscribe based on the proposed dates and plan type
 * @param email User's email address
 * @param startDate Proposed subscription start date
 * @param endDate Proposed subscription end date
 * @param planType The type of plan being purchased ('daily' or 'monthly')
 * @returns Object indicating if user can subscribe and reason if not
 */
export async function canUserSubscribeForDates(email: string, startDate: Date, endDate: Date, planType?: string) {
  try {
    // Get all active subscriptions for this user
    const allSubsUser = await prisma.user.findUnique({
      where: { email },
      include: { 
        subscriptions: {
          where: {
            status: "active",
          }
        } 
      }
    });
    
    if (!allSubsUser) {
      return {
        canSubscribe: true,
        reason: "User not found in database, can create new subscription",
        subscriptionDetails: null
      };
    }    
    
    // Check for any overlapping subscriptions
    const overlappingSubscriptions = allSubsUser.subscriptions.filter((sub: any) => {
      // Get dates for comparison
      const subStartDate = new Date(sub.startDate);
      const subEndDate = new Date(sub.endDate);
      const newStartDate = new Date(startDate);
      const newEndDate = new Date(endDate);
      
      // Remove time part for pure date comparison
      subStartDate.setHours(0, 0, 0, 0);
      subEndDate.setHours(0, 0, 0, 0);
      newStartDate.setHours(0, 0, 0, 0);
      newEndDate.setHours(0, 0, 0, 0);

      // Treat endDate as exclusive: allow booking if newStartDate >= subEndDate or newEndDate <= subStartDate
      if (newStartDate >= subEndDate || newEndDate < subStartDate) {
        return false;
      }
      /*
      // Allow adjacent daily plans (no overlap if one ends the day before the other starts)
      if (
        (sub.planType === 'daily' || planType === 'daily') &&
        (
          subEndDate.getTime() === newStartDate.getTime() ||
          newEndDate.getTime() === subStartDate.getTime() ||
          subEndDate.getTime() + 24 * 60 * 60 * 1000 === newStartDate.getTime() ||
          newEndDate.getTime() + 24 * 60 * 60 * 1000 === subStartDate.getTime()
        )
      ) {
        return false;
      }
      */
      // Only consider actual overlaps, not adjacent dates
      return true;
    });

    if (overlappingSubscriptions.length === 0) {
      // No overlaps, user can subscribe
      return {
        canSubscribe: true,
        reason: null,
        subscriptionDetails: null
      };
    }

    // We have overlapping subscriptions - check the specific cases
    
    // Case 1: User has a daily plan and is trying to buy a monthly plan that overlaps
    const dailySub = overlappingSubscriptions.find((sub: any) => sub.planType === 'daily');
    const hasOverlappingDailyPlan = !!dailySub;
    if (hasOverlappingDailyPlan && planType === 'monthly' && dailySub) {
      // Format dates for clearer messaging
      const formattedSubStart = formatDateDDMMYY(dailySub.startDate);
      const formattedSubEnd = formatDateDDMMYY(dailySub.endDate);
      const formattedNewStart = formatDateDDMMYY(startDate);
      const formattedNewEnd = formatDateDDMMYY(endDate);
      
      return {
        canSubscribe: false,
        reason: `Cannot book monthly plan from ${formattedNewStart} to ${formattedNewEnd} because you already have a daily plan on ${formattedSubStart}${formattedSubStart !== formattedSubEnd ? ` to ${formattedSubEnd}` : ''}. Please select non-overlapping dates.`,
        subscriptionDetails: dailySub
      };
    }
    // Case 2: User has a monthly plan and is trying to buy a daily plan that falls within that month
    const monthlySub = overlappingSubscriptions.find((sub: any) => sub.planType === 'monthly');
    const hasOverlappingMonthlyPlan = !!monthlySub;
    if (hasOverlappingMonthlyPlan && planType === 'daily' && monthlySub) {
      // Format dates for clearer messaging
      const formattedSubStart = formatDateDDMMYY(monthlySub.startDate);
      const formattedSubEnd = formatDateDDMMYY(monthlySub.endDate);
      const formattedNewStart = formatDateDDMMYY(startDate);
      
      return {
        canSubscribe: false,
        reason: `Cannot book daily plan for ${formattedNewStart} because you already have a monthly plan from ${formattedSubStart} to ${formattedSubEnd}. Please select a date outside your monthly plan.`,
        subscriptionDetails: monthlySub
      };
    }
    // Case 3: User has a daily plan and is trying to buy another daily plan for the same slot
    const hasOverlappingDailyForDaily = planType === 'daily' && hasOverlappingDailyPlan;
    if (hasOverlappingDailyForDaily && dailySub) {
      // Format dates for clearer messaging
      const formattedSubStart = formatDateDDMMYY(dailySub.startDate);
      const formattedSubEnd = formatDateDDMMYY(dailySub.endDate);
      const formattedNewStart = formatDateDDMMYY(startDate);
      
      return {
        canSubscribe: false,
        reason: `Cannot book daily plan for ${formattedNewStart} because you already have a booking for ${formattedSubStart}${formattedSubStart !== formattedSubEnd ? ` to ${formattedSubEnd}` : ''}. Please select a different date.`,
        subscriptionDetails: dailySub
      };
    }
    // Default case: Any other overlap is also not allowed
    const firstOverlapping = overlappingSubscriptions[0];
    // Format dates for clearer messaging (use DD:MM:YY)
    const formattedSubStart = formatDateDDMMYY(firstOverlapping.startDate);
    const formattedSubEnd = formatDateDDMMYY(firstOverlapping.endDate);
    const formattedNewStart = formatDateDDMMYY(startDate);
    const formattedNewEnd = formatDateDDMMYY(endDate);
    
    return {
      canSubscribe: false,
      reason: `Cannot book for ${formattedNewStart}${formattedNewStart !== formattedNewEnd ? ` to ${formattedNewEnd}` : ''} because you already have a subscription from ${formattedSubStart} to ${formattedSubEnd}. Please select non-overlapping dates.`,
      subscriptionDetails: firstOverlapping
    };
  } catch (error) {
    console.error("Error checking if user can subscribe for dates:", error);
    throw error;
  }
}

/**
 * Check if a user can subscribe
 * @param email User's email address
 * @param planType The type of plan being purchased ('daily' or 'monthly')
 * @param startDate Optional start date for the new subscription
 * @param endDate Optional end date for the new subscription
 * @returns Object indicating if user can subscribe and reason if not
 */
export async function canUserSubscribe(email: string, planType?: string, startDate?: Date, endDate?: Date) {
  try {
    // If we have specific dates, use the more specific function
    if (startDate && endDate) {
      return await canUserSubscribeForDates(email, startDate, endDate, planType);
    }
    
    // Otherwise, just check if the user has any active subscription
    const subscriptionStatus = await checkActiveSubscription(email);
    
    // User can always subscribe if they have no active subscription
    if (!subscriptionStatus.hasActiveSubscription) {
      return {
        canSubscribe: true,
        reason: null,
        subscriptionDetails: null
      };
    }
    
    // For users with an active subscription, further checks based on plan type
    const currentPlanType = subscriptionStatus.subscriptionDetails?.planType;
      // If user has a monthly plan and tries to buy any other plan (overlapping)
    if (currentPlanType === 'monthly') {
      return {
        canSubscribe: false,
        reason: `You already have an active monthly subscription until ${formatDateDDMMYY(subscriptionStatus.subscriptionDetails?.endDate)}. Please wait for it to expire or check non-overlapping dates.`,
        subscriptionDetails: subscriptionStatus.subscriptionDetails
      };
    }
      // If user has a daily plan and tries to buy any other plan (without specific dates)
    if (currentPlanType === 'daily') {
      return {
        canSubscribe: false,
        reason: `You already have an active daily subscription until ${formatDateDDMMYY(subscriptionStatus.subscriptionDetails?.endDate)}. Please wait for it to expire or check non-overlapping dates.`,
        subscriptionDetails: subscriptionStatus.subscriptionDetails
      };
    }
      // Default case - has an active subscription, don't allow overlap
    return {
      canSubscribe: false,
      reason: `You already have an active subscription until ${formatDateDDMMYY(subscriptionStatus.subscriptionDetails?.endDate)}`,
      subscriptionDetails: subscriptionStatus.subscriptionDetails
    };
  } catch (error) {
    console.error("Error checking if user can subscribe:", error);
    throw error;
  }
}

/**
 * Get all active subscriptions for today
 * @returns Array of active subscriptions with user details
 */
export async function getTodayActiveSubscriptions() {
  try {
    // Get today's date in IST
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    today.setHours(0, 0, 0, 0);
    
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "active",
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return activeSubscriptions;
  } catch (error) {
    console.error("Error fetching today's active subscriptions:", error);
    throw error;
  }
}

/**
 /**
 * Gets or creates a meeting link for today
 * @returns The meeting object for today
 */
export async function getOrCreateDailyMeetingLink(): Promise<MeetingWithUsers | null> {
  try {
    // Get today's date in IST
    const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    istDate.setHours(0, 0, 0, 0);

    // Check if we already have a meeting for today (in IST)
    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        meetingDate: {
          gte: new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate(), 0, 0, 0),
          lt: new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate() + 1, 0, 0, 0)
        }
      }
    });
    if (existingMeeting) {
      return existingMeeting;
    }

    // Get all users with active subscriptions for today
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        startDate: { lte: istDate },
        endDate: { gte: istDate }
      },
      select: { userId: true }
    });
    const userIds = activeSubscriptions.map(sub => sub.userId);

    // Get default meeting settings from environment variables
    const defaultPlatform = process.env.DEFAULT_MEETING_PLATFORM || 'google-meet';
    const defaultTime = process.env.DEFAULT_MEETING_TIME || '21:00';
    const defaultDuration = parseInt(process.env.DEFAULT_MEETING_DURATION || '60');    const todayStr = istDate.toISOString().split('T')[0];

    // Create the meeting with all users for today
    const meeting = await createCompleteMeeting({
      platform: defaultPlatform as 'google-meet' | 'zoom',
      date: todayStr,
      startTime: defaultTime,
      duration: defaultDuration,
      meetingTitle: 'GOALETE Club Daily Session',
      meetingDesc: 'Join us for a GOALETE Club session to learn how to achieve any goal in life.',
      userIds
    });
    return meeting;
  } catch (error) {
    console.error('Error creating daily meeting link:', error);
    throw error;
  }
}
