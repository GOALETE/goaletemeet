import type { Subscription, User } from "@/generated/prisma";
import { format } from "date-fns";

// Extended Subscription type with price field
interface SubscriptionWithPrice extends Subscription {
  price: number;
}

// Types for formatted admin data
export type AdminUserData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  referenceName?: string;
  createdAt: string;
  plan?: string;
  start?: string;
  end?: string;
  status?: string;
  price?: number;
  paymentStatus?: string;
  hasActiveOrUpcomingSubscriptions?: boolean;
  nextSessionDate?: string;
};

export type AdminSubscriptionData = {
  id: string;
  planType: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  duration?: number;
  orderId: string;
  price?: number;
};

export type AdminUserWithSubscriptions = AdminUserData & {
  subscriptions: AdminSubscriptionData[];
};

// Function to format user data for admin panel
export function formatUserForAdmin(
  user: User & { subscriptions: SubscriptionWithPrice[] }
): AdminUserData {
  const today = new Date();
  
  // Get the most recent subscription
  const currentSubscription = user.subscriptions.length > 0 
    ? user.subscriptions.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0]
    : null;

  // Calculate if user has active or upcoming subscriptions
  const hasActiveOrUpcomingSubscriptions = user.subscriptions.some(sub => {
    const startDate = new Date(sub.startDate);
    const endDate = new Date(sub.endDate);
    return sub.status === 'active' && (
      (startDate <= today && endDate >= today) || // Currently active
      startDate > today // Upcoming
    );
  });

  // Find next session date (earliest start date in the future or current active subscription)
  const nextSessionDate = user.subscriptions
    .filter(sub => {
      const startDate = new Date(sub.startDate);
      const endDate = new Date(sub.endDate);
      return sub.status === 'active' && (
        startDate > today || // Future subscription
        (startDate <= today && endDate >= today) // Currently active
      );
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]?.startDate;

  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    source: user.source,
    referenceName: user.referenceName || undefined,
    createdAt: user.createdAt.toISOString(),
    plan: currentSubscription?.planType,
    start: currentSubscription?.startDate.toISOString(),
    end: currentSubscription?.endDate.toISOString(),
    status: currentSubscription?.status,
    price: currentSubscription?.price,
    paymentStatus: currentSubscription?.paymentStatus,
    hasActiveOrUpcomingSubscriptions,
    nextSessionDate: nextSessionDate?.toISOString()
  };
}

// Function to format user with all subscriptions for admin detail view
export function formatUserWithSubscriptions(
  user: User & { subscriptions: SubscriptionWithPrice[] }
): AdminUserWithSubscriptions {
  return {
    ...formatUserForAdmin(user),
    subscriptions: user.subscriptions.map(sub => ({
      id: sub.id,
      planType: sub.planType,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate.toISOString(),
      status: sub.status,
      paymentStatus: sub.paymentStatus,
      duration: sub.duration || undefined,
      orderId: sub.orderId,
      price: sub.price
    }))
  };
}

// Function to generate CSV content from user data
export function generateCSV(users: AdminUserData[]): string {
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Source', 'Reference', 'Plan', 'Start Date', 'End Date', 'Status', 'Active Status', 'Next Session', 'Created At', 'Price (INR)'];
  const rows = users.map(user => [
    user.id,
    user.name,
    user.email,
    user.phone || '',
    user.source || '',
    user.referenceName || '',
    user.plan || '',
    user.start ? format(new Date(user.start), 'yyyy-MM-dd') : '',
    user.end ? format(new Date(user.end), 'yyyy-MM-dd') : '',
    user.status || '',
    user.hasActiveOrUpcomingSubscriptions ? 'Active' : 'Inactive',
    user.nextSessionDate ? format(new Date(user.nextSessionDate), 'yyyy-MM-dd') : 'No upcoming sessions',
    user.createdAt ? format(new Date(user.createdAt), 'yyyy-MM-dd') : '',
    user.price !== undefined && user.price !== null ? user.price.toString() : ''
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}

// Function to calculate subscription statistics
export function calculateSubscriptionStats(users: AdminUserData[]) {
  const today = new Date();
  const stats = {
    total: users.length,
    active: 0,
    expired: 0,
    upcoming: 0,
    byPlan: {
      'daily': 0,
      'monthly': 0,
      'unlimited': 0,
      other: 0
    }
  };

  users.forEach(user => {
    // Count active users based on hasActiveOrUpcomingSubscriptions flag
    if (user.hasActiveOrUpcomingSubscriptions) {
      stats.active++;
    } else {
      stats.expired++;
    }
    
    // Count upcoming users (subscriptions starting in the future)
    if (user.start && user.nextSessionDate) {
      const nextSession = new Date(user.nextSessionDate);
      if (nextSession > today) {
        stats.upcoming++;
      }
    }
    
    // Count by plan type - split family-monthly into monthly
    if (user.plan) {
      const planType = user.plan.toLowerCase();
      if (planType === 'daily' || planType === 'daily') {
        stats.byPlan['daily']++;
      } else if (planType === 'monthly') {
        stats.byPlan.monthly++;
      } else if (planType === 'family-monthly' || planType === 'monthlyfamily') {
        // Split family-monthly into 2 monthly entries
        stats.byPlan.monthly += 2;
      } else if (planType === 'unlimited') {
        stats.byPlan.unlimited++;
      } else {
        stats.byPlan.other++;
      }
    }
  });

  return stats;
}
