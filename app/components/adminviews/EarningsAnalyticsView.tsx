'use client';

import { useState, useEffect } from 'react';
import { format, subDays, subMonths } from 'date-fns';

type AnalyticsData = {
  totalRevenue: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  newSubscriptions: number;
  subscriptionsByPlan: Record<string, number>;
  revenueByPlan: Record<string, number>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  subscriptionsByDay: Array<{ date: string; count: number }>;
};

export default function EarningsAnalyticsView() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days');
  const [customRange, setCustomRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('paid');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        setLoading(false);
        return;
      }
      
      // Determine date range for query
      let startDate, endDate;
      
      if (dateRange === 'custom') {
        startDate = customRange.startDate;
        endDate = customRange.endDate;
      } else {
        endDate = format(new Date(), 'yyyy-MM-dd');
        
        if (dateRange === '7days') {
          startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        } else if (dateRange === '30days') {
          startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        } else if (dateRange === '90days') {
          startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
        }
      }
      
      const response = await fetch(`/api/admin/statistics?startDate=${startDate}&endDate=${endDate}&paymentStatus=${paymentFilter}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics: ' + (error instanceof Error ? error.message : String(error)));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, customRange, paymentFilter]);

  // Handle date range change
  const handleDateRangeChange = (range: '7days' | '30days' | '90days' | 'custom') => {
    setDateRange(range);
    
    // If changing to a preset range, update custom range too for consistency
    if (range !== 'custom') {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      let startDate;
      
      if (range === '7days') {
        startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      } else if (range === '30days') {
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      } else if (range === '90days') {
        startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      }
      
      setCustomRange({ startDate: startDate!, endDate });
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Earnings Analytics</h2>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Date Range Selector */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Date Range</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <button 
              className={`px-4 py-2 rounded text-sm ${dateRange === '7days' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handleDateRangeChange('7days')}
            >
              Last 7 Days
            </button>
            <button 
              className={`px-4 py-2 rounded text-sm ${dateRange === '30days' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handleDateRangeChange('30days')}
            >
              Last 30 Days
            </button>
            <button 
              className={`px-4 py-2 rounded text-sm ${dateRange === '90days' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handleDateRangeChange('90days')}
            >
              Last 90 Days
            </button>
            <button 
              className={`px-4 py-2 rounded text-sm ${dateRange === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => handleDateRangeChange('custom')}
            >
              Custom Range
            </button>
          </div>
          
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={customRange.startDate}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={customRange.endDate}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Payment Status Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Status</h3>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded text-sm ${paymentFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setPaymentFilter('all')}
            >
              All
            </button>
            <button
              className={`px-4 py-2 rounded text-sm ${paymentFilter === 'paid' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setPaymentFilter('paid')}
            >
              Paid Only
            </button>
            <button
              className={`px-4 py-2 rounded text-sm ${paymentFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setPaymentFilter('pending')}
            >
              Pending
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        </div>
      ) : error ? (
        <div className="p-4 text-red-600 bg-red-50 rounded">
          {error}
        </div>
      ) : analyticsData ? (
        <div>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm text-blue-700 font-semibold">Total Revenue</h3>
              <p className="text-2xl font-bold">₹{analyticsData.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm text-green-700 font-semibold">Active Subscriptions</h3>
              <p className="text-2xl font-bold">{analyticsData.activeSubscriptions}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm text-purple-700 font-semibold">Total Subscriptions</h3>
              <p className="text-2xl font-bold">{analyticsData.totalSubscriptions}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="text-sm text-amber-700 font-semibold">New Subscriptions</h3>
              <p className="text-2xl font-bold">{analyticsData.newSubscriptions}</p>
            </div>
          </div>
          
          {/* Charts Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue Over Time (Bar Chart) */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Revenue Over Time</h3>
              <div className="h-64 mt-4">
                {/* This would be a bar chart in a real implementation */}
                <div className="h-full flex items-end justify-between space-x-1">
                  {analyticsData.revenueByDay.slice(-14).map((item, index) => {
                    const maxRevenue = Math.max(...analyticsData.revenueByDay.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-blue-500 rounded-t" 
                          style={{ height: `${height}%` }}
                          title={`₹${item.revenue}`}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                          {format(new Date(item.date), 'MMM d')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Subscriptions Over Time (Line Chart) */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Subscriptions Over Time</h3>
              <div className="h-64 mt-4">
                {/* This would be a line chart in a real implementation */}
                <div className="h-full flex items-end justify-between space-x-1">
                  {analyticsData.subscriptionsByDay.slice(-14).map((item, index) => {
                    const maxCount = Math.max(...analyticsData.subscriptionsByDay.map(d => d.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-green-500 rounded-t" 
                          style={{ height: `${height}%` }}
                          title={`${item.count} subscriptions`}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                          {format(new Date(item.date), 'MMM d')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Plan Distribution & Revenue by Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Subscriptions by Plan</h3>
              <div className="space-y-2 mt-4">
                {Object.entries(analyticsData.subscriptionsByPlan).map(([plan, count]) => (
                  <div key={plan}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{plan}</span>
                      <span className="text-sm text-gray-500">{count} subscriptions</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${(count / analyticsData.totalSubscriptions) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Revenue by Plan</h3>
              <div className="space-y-2 mt-4">
                {Object.entries(analyticsData.revenueByPlan).map(([plan, revenue]) => (
                  <div key={plan}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{plan}</span>
                      <span className="text-sm text-gray-500">₹{revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${(revenue / analyticsData.totalRevenue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          No analytics data available. Try adjusting the date range or payment filter.
        </div>
      )}
    </div>
  );
}
