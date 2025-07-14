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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Earnings Analytics
              </h1>
              <p className="text-gray-600 font-medium mt-1">
                Comprehensive revenue and subscription insights
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Date Range Selector */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Date Range</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    dateRange === '7days' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-indigo-50'
                  }`}
                  onClick={() => handleDateRangeChange('7days')}
                >
                  Last 7 Days
                </button>
                <button 
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    dateRange === '30days' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-indigo-50'
                  }`}
                  onClick={() => handleDateRangeChange('30days')}
                >
                  Last 30 Days
                </button>
                <button 
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    dateRange === '90days' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-indigo-50'
                  }`}
                  onClick={() => handleDateRangeChange('90days')}
                >
                  Last 90 Days
                </button>
                <button 
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    dateRange === 'custom' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-indigo-50'
                  }`}
                  onClick={() => handleDateRangeChange('custom')}
                >
                  Custom Range
                </button>
              </div>
              
              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                      value={customRange.startDate}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                      value={customRange.endDate}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status Filter */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Payment Status</span>
              </h3>
              <div className="flex gap-3">
                <button
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    paymentFilter === 'all'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-emerald-50'
                  }`}
                  onClick={() => setPaymentFilter('all')}
                >
                  All Payments
                </button>
                <button
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    paymentFilter === 'paid'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-emerald-50'
                  }`}
                  onClick={() => setPaymentFilter('paid')}
                >
                  Paid Only
                </button>
                <button
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    paymentFilter === 'pending'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-emerald-50'
                  }`}
                  onClick={() => setPaymentFilter('pending')}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        </div>
        
      {loading ? (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
            <h3 className="text-xl font-bold text-gray-700">Loading Analytics</h3>
            <p className="text-gray-500">Fetching earnings and subscription data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800">Analytics Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      ) : analyticsData ? (
        <div className="space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-emerald-800 mb-1">Total Revenue</h3>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-800 bg-clip-text text-transparent">₹{analyticsData.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-blue-800 mb-1">Active</h3>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">{analyticsData.activeSubscriptions}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-purple-800 mb-1">Total</h3>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-800 bg-clip-text text-transparent">{analyticsData.totalSubscriptions}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-100 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-amber-800 mb-1">New</h3>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-800 bg-clip-text text-transparent">{analyticsData.newSubscriptions}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Charts Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Over Time Chart */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Revenue Over Time</h3>
              </div>
              <div className="h-80 mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                <div className="h-full flex items-end justify-between space-x-2">
                  {analyticsData.revenueByDay.slice(-14).map((item, index) => {
                    const maxRevenue = Math.max(...analyticsData.revenueByDay.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-indigo-600 rounded-t-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 group-hover:scale-110 shadow-lg" 
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`₹${item.revenue}`}
                        ></div>
                        <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-top-left font-medium">
                          {format(new Date(item.date), 'MMM d')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Subscriptions Over Time Chart */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Subscriptions Over Time</h3>
              </div>
              <div className="h-80 mt-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6">
                <div className="h-full flex items-end justify-between space-x-2">
                  {analyticsData.subscriptionsByDay.slice(-14).map((item, index) => {
                    const maxCount = Math.max(...analyticsData.subscriptionsByDay.map(d => d.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-500 to-green-600 rounded-t-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-300 group-hover:scale-110 shadow-lg" 
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${item.count} subscriptions`}
                        ></div>
                        <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-top-left font-medium">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Subscriptions by Plan</h3>
              </div>
              <div className="space-y-4 mt-6">
                {Object.entries(analyticsData.subscriptionsByPlan).map(([plan, count]) => {
                  const planDisplayName = plan === 'daily' ? 'Daily' : 
                                         plan === 'monthly' ? 'Monthly' :
                                         plan === 'unlimited' ? 'Unlimited' :
                                         plan.charAt(0).toUpperCase() + plan.slice(1);
                  return (
                    <div key={plan} className="group">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-purple-700 transition-colors">{planDisplayName}</span>
                        <span className="text-sm text-gray-500">{count} subscriptions</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-violet-600 h-3 rounded-full shadow-lg transition-all duration-500 group-hover:from-purple-600 group-hover:to-violet-700" 
                          style={{ width: `${(count / analyticsData.totalSubscriptions) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Revenue by Plan</h3>
              </div>
              <div className="space-y-4 mt-6">
                {Object.entries(analyticsData.revenueByPlan).map(([plan, revenue]) => {
                  const planDisplayName = plan === 'daily' ? 'Daily' : 
                                         plan === 'monthly' ? 'Monthly' :
                                         plan === 'unlimited' ? 'Unlimited' :
                                         plan.charAt(0).toUpperCase() + plan.slice(1);
                  return (
                    <div key={plan} className="group">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-emerald-700 transition-colors">{planDisplayName}</span>
                        <span className="text-sm text-gray-500">₹{revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full shadow-lg transition-all duration-500 group-hover:from-emerald-600 group-hover:to-green-700" 
                          style={{ width: `${(revenue / analyticsData.totalRevenue) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-12 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No Analytics Data</h3>
              <p className="text-gray-500 text-lg">No analytics data available. Try adjusting the date range or payment filter.</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
