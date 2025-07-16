import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Define the props interface matching AdminDashboard usage
interface SubscriptionsViewProps {
  subscriptionView: 'all' | 'thisWeek' | 'upcoming';
  setSubscriptionView: (view: 'all' | 'thisWeek' | 'upcoming') => void;
  subscriptionUsers: any[]; // Now contains individual subscription records with nested user data
  subscriptionsLoading: boolean;
  revenue: number;
  handleRowClick: (userId: string) => void;
}

const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptionView,
  setSubscriptionView,
  subscriptionUsers,
  subscriptionsLoading,
  revenue,
  handleRowClick
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'upcoming' | 'cancelled'>('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Filter subscriptions based on status and view type
  const filteredSubscriptions = subscriptionUsers.filter(subscription => {
    if (!subscription) return false;

    const today = new Date();
    const startDate = new Date(subscription.startDate);
    const endDate = new Date(subscription.endDate);
    
    // Status filter - handle cancelled status properly
    if (filter !== 'all') {
      // First determine the actual status (respecting cancelled from DB)
      const today = new Date();
      const startDate = new Date(subscription.startDate);
      const endDate = new Date(subscription.endDate);
      let actualStatus = subscription.status;
      
      // Only calculate status if it's not explicitly set to cancelled/canceled
      if (!actualStatus || (actualStatus !== 'cancelled' && actualStatus !== 'canceled')) {
        if (startDate <= today && endDate >= today) {
          actualStatus = 'active';
        } else if (endDate < today) {
          actualStatus = 'expired';
        } else if (startDate > today) {
          actualStatus = 'upcoming';
        }
      }
      
      // Apply the filter based on actual status
      if (filter === 'active' && actualStatus !== 'active') {
        return false;
      }
      if (filter === 'expired' && actualStatus !== 'expired') {
        return false;
      }
      if (filter === 'upcoming' && actualStatus !== 'upcoming') {
        return false;
      }
      if (filter === 'cancelled' && !(actualStatus === 'cancelled' || actualStatus === 'canceled')) {
        return false;
      }
    }
    
    // View type filtering - more inclusive for monthly subscriptions
    if (subscriptionView !== 'all') {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Normalize to start of day
      
      if (subscriptionView === 'thisWeek') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        weekEnd.setHours(23, 59, 59, 999); // End of day
        
        // For monthly subscriptions: show if they are active during this week OR start this week
        // For daily subscriptions: show if they start or are active this week
        const isActiveThisWeek = startDate <= weekEnd && endDate >= weekStart;
        const startsThisWeek = startDate >= weekStart && startDate <= weekEnd;
        
        if (!(isActiveThisWeek || startsThisWeek)) {
          return false;
        }
      } else if (subscriptionView === 'upcoming') {
        // Show subscriptions that start in the future OR are currently active
        // This ensures monthly subscriptions show up in upcoming tab
        const isUpcoming = startDate > now;
        const isCurrentlyActive = startDate <= now && endDate >= now;
        
        if (!(isUpcoming || isCurrentlyActive)) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Calculate active subscriptions (respecting cancelled status)
  const activeSubscriptions = filteredSubscriptions.filter(subscription => {
    if (!subscription) return false;
    const today = new Date();
    const startDate = new Date(subscription.startDate);
    const endDate = new Date(subscription.endDate);
    
    // If subscription is cancelled, it's not active
    if (subscription.status === 'cancelled' || subscription.status === 'canceled') {
      return false;
    }
    
    return startDate <= today && endDate >= today;
  });

  // Calculate upcoming subscriptions (respecting cancelled status)
  const upcomingSubscriptions = filteredSubscriptions.filter(subscription => {
    if (!subscription) return false;
    
    // If subscription is cancelled, it's not upcoming
    if (subscription.status === 'cancelled' || subscription.status === 'canceled') {
      return false;
    }
    
    return new Date(subscription.startDate) > new Date();
  });

  // Calculate expired subscriptions (respecting cancelled status)
  const expiredSubscriptions = filteredSubscriptions.filter(subscription => {
    if (!subscription) return false;
    const today = new Date();
    const endDate = new Date(subscription.endDate);
    
    // If subscription is cancelled, it's not just expired
    if (subscription.status === 'cancelled' || subscription.status === 'canceled') {
      return false;
    }
    
    return endDate < today;
  });

  // Calculate cancelled subscriptions
  const cancelledSubscriptions = filteredSubscriptions.filter(subscription => {
    if (!subscription) return false;
    return subscription.status === 'cancelled' || subscription.status === 'canceled';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Subscriptions
              </h2>
              <p className="text-gray-600 mt-1">Manage and monitor subscription status</p>
            </div>
          </div>
          
          {/* View Toggle Buttons */}
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-white/20">
            <button 
              onClick={() => setSubscriptionView('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 ${
                subscriptionView === 'all' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>All</span>
            </button>
            <button 
              onClick={() => setSubscriptionView('thisWeek')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 ${
                subscriptionView === 'thisWeek' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>This Week</span>
            </button>
            <button 
              onClick={() => setSubscriptionView('upcoming')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 ${
                subscriptionView === 'upcoming' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Upcoming</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
          <span>Filters & Options</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select 
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="upcoming">Upcoming</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-blue-800 mb-1">Total Subscriptions</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{filteredSubscriptions.length}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-emerald-800 mb-1">Total Revenue</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-800 bg-clip-text text-transparent">₹{revenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-100 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-purple-800 mb-1">Active</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-800 bg-clip-text text-transparent">{activeSubscriptions.length}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-100 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-amber-800 mb-1">Upcoming</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-800 bg-clip-text text-transparent">{upcomingSubscriptions.length}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-pink-100 backdrop-blur-sm rounded-2xl shadow-xl border border-red-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-1">Expired</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-800 bg-clip-text text-transparent">{expiredSubscriptions.length}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-slate-100 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Cancelled</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-800 bg-clip-text text-transparent">{cancelledSubscriptions.length}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-gray-500 to-slate-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {subscriptionsLoading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-gray-600 font-medium">Loading subscriptions...</p>
          </div>
        </div>
      ) : (
        <>
          {filteredSubscriptions.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-700">No subscriptions found</h3>
                <p className="text-gray-500">No subscriptions match the selected filters.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Subscription Records</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200/50">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>User</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Plan</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Duration</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <span>Price</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <span>Order ID</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200/30">
                    {filteredSubscriptions.map((subscription) => {
                      if (!subscription) return null;
                      
                      // Determine subscription status
                      const today = new Date();
                      const startDate = new Date(subscription.startDate);
                      const endDate = new Date(subscription.endDate);
                      let status = subscription.status;
                      
                      // Only calculate status if it's not explicitly set to cancelled/canceled
                      if (!status || (status !== 'cancelled' && status !== 'canceled')) {
                        if (startDate <= today && endDate >= today) {
                          status = 'active';
                        } else if (endDate < today) {
                          status = 'expired';
                        } else if (startDate > today) {
                          status = 'upcoming';
                        }
                      }
                      
                      return (
                        <tr key={subscription.id} onClick={() => handleRowClick(subscription.userId)} 
                            className="cursor-pointer hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 group">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                  {subscription.userName?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{subscription.userName}</div>
                                <div className="text-sm text-gray-500">{subscription.userEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full">
                                <span className="text-sm font-bold text-blue-800">{subscription.planType}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {subscription.planType === 'unlimited' 
                                ? `${format(new Date(subscription.startDate), 'MMM d, yyyy')} - Unlimited`
                                : `${format(new Date(subscription.startDate), 'MMM d, yyyy')} - ${format(new Date(subscription.endDate), 'MMM d, yyyy')}`
                              }
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {subscription.planType === 'unlimited' 
                                  ? 'Lifetime Access'
                                  : `${subscription.duration || Math.round((new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`px-3 py-2 inline-flex items-center text-xs leading-5 font-bold rounded-full shadow-sm transition-all duration-300 group-hover:scale-105 
                              ${status === 'active' ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200' : 
                                status === 'upcoming' ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200' : 
                                  status === 'expired' ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200' : 
                                    (status === 'cancelled' || status === 'canceled') ? 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-300' :
                                      'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200'}`}>
                              <div className={`w-2 h-2 rounded-full mr-2 
                                ${status === 'active' ? 'bg-emerald-500' : 
                                  status === 'upcoming' ? 'bg-blue-500' : 
                                    status === 'expired' ? 'bg-red-500' : 
                                      (status === 'cancelled' || status === 'canceled') ? 'bg-gray-500' :
                                        'bg-amber-500'}`}>
                              </div>
                              {status === 'cancelled' || status === 'canceled' ? 'cancelled' : status}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              <span className="text-sm font-bold text-gray-900">₹{subscription.price || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">
                              {subscription.orderId}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubscriptionsView;
