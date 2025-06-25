import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Define the props interface matching AdminDashboard usage
interface SubscriptionsViewProps {
  subscriptionView: 'all' | 'thisWeek' | 'upcoming';
  setSubscriptionView: (view: 'all' | 'thisWeek' | 'upcoming') => void;
  subscriptionUsers: any[];
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
  const [filter, setFilter] = useState<'all' | 'active' | 'finished' | 'upcoming'>('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Filter subscriptions based on status
  const filteredSubscriptions = subscriptionUsers.filter(user => {
    if (!user.subscription) return false;

    const today = new Date();
    const startDate = new Date(user.subscription.startDate);
    const endDate = new Date(user.subscription.endDate);
    
    // Status filter
    if (filter !== 'all') {
      if (filter === 'active' && !(startDate <= today && endDate >= today)) {
        return false;
      }
      if (filter === 'finished' && !(endDate < today)) {
        return false;
      }
      if (filter === 'upcoming' && !(startDate > today)) {
        return false;
      }
    }
    
    // Date filter from props
    if (subscriptionView !== 'all') {
      const now = new Date();
      
      if (subscriptionView === 'thisWeek') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        // Check if subscription overlaps with this week
        if (!(endDate >= weekStart && startDate <= weekEnd)) {
          return false;
        }
      } else if (subscriptionView === 'upcoming') {
        if (!(startDate > now)) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Calculate active subscriptions
  const activeSubscriptions = filteredSubscriptions.filter(user => {
    if (!user.subscription) return false;
    const today = new Date();
    const startDate = new Date(user.subscription.startDate);
    const endDate = new Date(user.subscription.endDate);
    return startDate <= today && endDate >= today;
  });

  // Calculate upcoming subscriptions
  const upcomingSubscriptions = filteredSubscriptions.filter(user => {
    if (!user.subscription) return false;
    return new Date(user.subscription.startDate) > new Date();
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Subscriptions</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSubscriptionView('all')}
            className={`px-3 py-1 rounded ${
              subscriptionView === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setSubscriptionView('thisWeek')}
            className={`px-3 py-1 rounded ${
              subscriptionView === 'thisWeek' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
          <button 
            onClick={() => setSubscriptionView('upcoming')}
            className={`px-3 py-1 rounded ${
              subscriptionView === 'upcoming' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="finished">Finished</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm text-blue-700 font-semibold">Total Subscriptions</h3>
          <p className="text-2xl font-bold">{filteredSubscriptions.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm text-green-700 font-semibold">Total Revenue</h3>
          <p className="text-2xl font-bold">₹{revenue.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm text-purple-700 font-semibold">Active Subscriptions</h3>
          <p className="text-2xl font-bold">{activeSubscriptions.length}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <h3 className="text-sm text-amber-700 font-semibold">Upcoming Subscriptions</h3>
          <p className="text-2xl font-bold">{upcomingSubscriptions.length}</p>
        </div>
      </div>
      
      {subscriptionsLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        </div>
      ) : (
        <>
          {filteredSubscriptions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No subscriptions found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubscriptions.map((user) => {
                    const subscription = user.subscription;
                    if (!subscription) return null;
                    
                    // Determine subscription status
                    const today = new Date();
                    const startDate = new Date(subscription.startDate);
                    const endDate = new Date(subscription.endDate);
                    let status = subscription.status;
                    
                    if (startDate <= today && endDate >= today) {
                      status = 'active';
                    } else if (endDate < today) {
                      status = 'finished';
                    } else if (startDate > today) {
                      status = 'upcoming';
                    }
                    
                    return (
                      <tr key={subscription.id} onClick={() => handleRowClick(user.id)} className="cursor-pointer hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{subscription.planType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(subscription.startDate), 'MMM d, yyyy')} - {format(new Date(subscription.endDate), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {subscription.duration || Math.round((new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${status === 'active' ? 'bg-green-100 text-green-800' : 
                              status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 
                                status === 'finished' ? 'bg-gray-100 text-gray-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{subscription.price || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscription.orderId}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubscriptionsView;
