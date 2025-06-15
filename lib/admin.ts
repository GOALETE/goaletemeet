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
  // Get the most recent subscription
  const currentSubscription = user.subscriptions.length > 0 
    ? user.subscriptions.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0]
    : null;
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
    paymentStatus: currentSubscription?.paymentStatus
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
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Source', 'Reference', 'Plan', 'Start Date', 'End Date', 'Status', 'Created At', 'Price (INR)'];
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
      monthly: 0,
      quarterly: 0,
      yearly: 0,
      other: 0
    }
  };

  users.forEach(user => {
    if (user.start && user.end) {
      const startDate = new Date(user.start);
      const endDate = new Date(user.end);
      
      // Count by status
      if (startDate <= today && endDate >= today && user.status === 'active') {
        stats.active++;
      } else if (endDate < today || user.status !== 'active') {
        stats.expired++;
      } else if (startDate > today && user.status === 'active') {
        stats.upcoming++;
      }
      
      // Count by plan type
      if (user.plan) {
        if (user.plan.toLowerCase().includes('monthly')) {
          stats.byPlan.monthly++;
        } else if (user.plan.toLowerCase().includes('quarterly')) {
          stats.byPlan.quarterly++;
        } else if (user.plan.toLowerCase().includes('yearly')) {
          stats.byPlan.yearly++;
        } else {
          stats.byPlan.other++;
        }
      }
    }
  });

  return stats;
}
