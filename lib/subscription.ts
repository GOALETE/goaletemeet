import prisma from './prisma';

/**
 * Check if a user has an active subscription
 * @param email User's email address
 * @returns Object containing subscription status and details
 */
export async function checkActiveSubscription(email: string) {
  try {
    // Get current date
    const today = new Date();
    
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
        ? `User has an active subscription ending on ${userWithSubs.subscriptions[0].endDate.toISOString().split('T')[0]}`
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
      // Overlap if: (startDate <= sub.endDate) && (endDate >= sub.startDate)
      return new Date(startDate) <= new Date(sub.endDate) && new Date(endDate) >= new Date(sub.startDate);
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
      return {
        canSubscribe: false,
        reason: `Cannot purchase a monthly plan that overlaps with your existing daily plan from ${dailySub.startDate.toISOString().split('T')[0]} to ${dailySub.endDate.toISOString().split('T')[0]}`,
        subscriptionDetails: dailySub
      };
    }
    
    // Case 2: User has a monthly plan and is trying to buy a daily plan that falls within that month
    const monthlySub = overlappingSubscriptions.find((sub: any) => sub.planType === 'monthly');
    const hasOverlappingMonthlyPlan = !!monthlySub;
    
    if (hasOverlappingMonthlyPlan && planType === 'daily' && monthlySub) {
      return {
        canSubscribe: false,
        reason: `Cannot purchase a daily plan that overlaps with your existing monthly plan from ${monthlySub.startDate.toISOString().split('T')[0]} to ${monthlySub.endDate.toISOString().split('T')[0]}`,
        subscriptionDetails: monthlySub
      };
    }
    
    // Case 3: User has a daily plan and is trying to buy another daily plan for the same slot
    const hasOverlappingDailyForDaily = planType === 'daily' && hasOverlappingDailyPlan;
    if (hasOverlappingDailyForDaily && dailySub) {
      return {
        canSubscribe: false,
        reason: `Cannot purchase a daily plan that overlaps with your existing daily plan from ${dailySub.startDate.toISOString().split('T')[0]} to ${dailySub.endDate.toISOString().split('T')[0]}`,
        subscriptionDetails: dailySub
      };
    }
    
    // Default case: Any other overlap is also not allowed
    const firstOverlapping = overlappingSubscriptions[0];
    return {
      canSubscribe: false,
      reason: `You already have an overlapping subscription from ${firstOverlapping.startDate.toISOString().split('T')[0]} to ${firstOverlapping.endDate.toISOString().split('T')[0]}`,
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
        reason: `You already have an active monthly subscription until ${subscriptionStatus.subscriptionDetails?.endDate.toISOString().split('T')[0]}. Please wait for it to expire or check non-overlapping dates.`,
        subscriptionDetails: subscriptionStatus.subscriptionDetails
      };
    }
    
    // If user has a daily plan and tries to buy any other plan (without specific dates)
    if (currentPlanType === 'daily') {
      return {
        canSubscribe: false,
        reason: `You already have an active daily subscription until ${subscriptionStatus.subscriptionDetails?.endDate.toISOString().split('T')[0]}. Please wait for it to expire or check non-overlapping dates.`,
        subscriptionDetails: subscriptionStatus.subscriptionDetails
      };
    }
    
    // Default case - has an active subscription, don't allow overlap
    return {
      canSubscribe: false,
      reason: `You already have an active subscription until ${subscriptionStatus.subscriptionDetails?.endDate.toISOString().split('T')[0]}`,
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
    const today = new Date();
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
 * Creates a daily meeting link for today if it doesn't exist
 * @returns The daily meeting link object
 */
export async function getOrCreateDailyMeetingLink() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if we already have a meeting link for today
    const existingLink = await prisma.dailyMeetingLink.findFirst({
      where: {
        meetingDate: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    if (existingLink) {
      return existingLink;
    }
    
    // Get meeting settings to determine platform
    const meetingSettings = await prisma.meetingSetting.findFirst({
      where: { id: 1 }
    });

    if (!meetingSettings) {
      throw new Error("Meeting settings not found");
    }
    
    // Generate a new meeting link based on the platform
    let meetingLink;
    const platform = meetingSettings.platform;
    
    if (platform === "zoom") {
      // Use the default Zoom link from settings
      meetingLink = meetingSettings.zoomLink || "https://zoom.us/j/yourdefaultlink";
    } else {
      // Use the default Google Meet link from settings
      meetingLink = meetingSettings.meetLink || "https://meet.google.com/yourdefaultlink";
    }
    
    // Create the daily meeting link record
    const dailyMeetingLink = await prisma.dailyMeetingLink.create({
      data: {
        meetingDate: today,
        meetingLink,
        platform,
        meetingSettingId: meetingSettings.id
      }
    });
    
    return dailyMeetingLink;
  } catch (error) {
    console.error("Error creating daily meeting link:", error);
    throw error;
  }
}
