'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import AdminCalendar from './adminviews/AdminCalendar';
import UsersView from './adminviews/UsersView';
import UserDetailModal, { UserWithSubscriptions as UserDetailModalType } from './adminviews/UserDetailModal';
import CreateUserModal from './adminviews/CreateUserModal';
import SubscriptionsView from './adminviews/SubscriptionsView';
import UpcomingRegistrationsView from './adminviews/UpcomingRegistrationsView';
import TodayMeetingCard from './adminviews/TodayMeetingCard';
import EarningsAnalyticsView from './adminviews/EarningsAnalyticsView';
import { useRefresh, useRefreshListener } from '../hooks/useRefresh';

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  createdAt: string;
  plan?: string;
  start?: string;
  end?: string;
  status?: string;
  price?: number;
  paymentStatus?: string;
  role?: string;
};

type Subscription = {
  id: string;
  planType: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  duration?: number;
  price?: number;
  orderId: string;
};

type Meeting = {
  id: string;
  meetingDate: string;
  platform: string;
  meetingLink: string;
  startTime: string;
  endTime: string;
  startTimeUTC: string;
  endTimeUTC: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  meetingDesc: string;
  meetingTitle: string;
};

type UserWithSubscriptions = UserData & {
  subscriptions: Subscription[];
};

interface AdminDashboardProps {
  initialUsers?: UserData[];
}

// Toast notification system
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast(null), 2500);
  };
  return { toast, showToast };
}

export default function AdminDashboard({ initialUsers = [] }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'calendar' | 'upcoming' | 'subscriptions' | 'analytics'>('users');
  const [subscriptionView, setSubscriptionView] = useState<'all' | 'thisWeek' | 'upcoming'>('all');
  
  // Use the refresh system
  const { triggerRefresh, refreshTriggers, isRefreshing } = useRefresh();
  
  // Tab-specific data states
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [upcomingRegistrations, setUpcomingRegistrations] = useState<any[]>([]);
  const [subscriptionUsers, setSubscriptionUsers] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  
  // Tab-specific loading states
  const [usersLoading, setUsersLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // General states
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetailModalType | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [refreshMeetingTrigger, setRefreshMeetingTrigger] = useState(0);
  
  // Filter states - simplified
  const [filterState, setFilterState] = useState({
    dateRange: 'all',
    startDate: '',
    endDate: '',
    status: 'all',
    source: 'all',
    paymentStatus: 'all',
    search: '',
    showExpiringSoon: false
  });
  
  // Pagination and sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Stats and analytics data
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    upcoming: 0,
  });
  const [revenue, setRevenue] = useState(0);
  const [paymentStats, setPaymentStats] = useState<any[]>([]);
  const [planStats, setPlanStats] = useState<any[]>([]);

  // Create a memoized updateFilter function
  const updateFilter = useCallback((key: any, value: any) => {
    setFilterState((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const { toast, showToast } = useToast();

  // Only one fetchUsers function, wrapped in useCallback
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    // Build query parameters based on current filters
    const queryParams = new URLSearchParams();
    if (filterState.status !== 'all') queryParams.set('status', filterState.status);
    if (filterState.paymentStatus !== 'all') queryParams.set('paymentStatus', filterState.paymentStatus);
    
    if (filterState.dateRange === 'custom' && filterState.startDate && filterState.endDate) {
      queryParams.set('startDate', filterState.startDate);
      queryParams.set('endDate', filterState.endDate);
    } else if (filterState.dateRange === 'today') {
      const today = new Date();
      queryParams.set('startDate', format(today, 'yyyy-MM-dd'));
      queryParams.set('endDate', format(today, 'yyyy-MM-dd'));
    } else if (filterState.dateRange === 'thisWeek') {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      queryParams.set('startDate', format(startOfWeek, 'yyyy-MM-dd'));
      queryParams.set('endDate', format(endOfWeek, 'yyyy-MM-dd'));
    } else if (filterState.dateRange === 'thisMonth') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      queryParams.set('startDate', format(startOfMonth, 'yyyy-MM-dd'));
      queryParams.set('endDate', format(endOfMonth, 'yyyy-MM-dd'));
    }
    
    if (filterState.source !== 'all') queryParams.set('source', filterState.source);
    if (filterState.search) queryParams.set('search', filterState.search);
    queryParams.set('sortBy', sortBy);
    queryParams.set('sortOrder', sortOrder);
    queryParams.set('page', String(page));
    queryParams.set('pageSize', String(pageSize));
    
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication required');
        setUsersLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
      setTotal(data.total);
      
      // Set user stats from the API response
      if (data.stats) {
        setUserStats({
          total: data.stats.total || 0,
          active: data.stats.active || 0,
          expired: data.stats.expired || 0,
          upcoming: data.stats.upcoming || 0,
        });
      }
      
      setUsersLoading(false);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching users data:', error);
      setError('Error fetching users data');
      setUsersLoading(false);
    }
  }, [filterState, sortBy, sortOrder, page, pageSize]);

  // Global loading state for data refresh
  const [globalRefreshLoading, setGlobalRefreshLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Global data refresh function
  const refreshAllData = useCallback(async () => {
    setGlobalRefreshLoading(true);
    try {
      // Refresh data based on the active tab
      switch (activeTab) {
        case 'users':
          await fetchUsers();
          break;
        case 'calendar':
          await fetchCalendarData();
          break;
        case 'upcoming':
          await fetchUpcomingData();
          break;
        case 'subscriptions':
          await fetchNewSubscriptionData(subscriptionView);
          break;
        case 'analytics':
          await fetchAnalytics();
          break;
      }
      setLastUpdated(new Date());
    } finally {
      setGlobalRefreshLoading(false);
    }
  }, [activeTab, fetchUsers, subscriptionView]);

  // Tab-specific fetch functions
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication required');
        setAnalyticsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const data = await response.json();
      setAnalyticsData(data);
      setAnalyticsLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(`Error fetching analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchCalendarData = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication required');
        setCalendarLoading(false);
        return;
      }

      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/admin/meetings?startDate=${startDate}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch upcoming meetings');
      }

      const data = await response.json();
      setUpcomingMeetings(data.meetings || []);
      setCalendarLoading(false);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError('Error fetching calendar data');
      setCalendarLoading(false);
    }
  }, []);

  const fetchUpcomingData = useCallback(async () => {
    setUpcomingLoading(true);
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication required');
        setUpcomingLoading(false);
        return;
      }
      
      // Get active subscriptions for upcoming dates (in IST)
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      
      // Use the existing API to get all active users (including daily plans)
      const queryParams = new URLSearchParams();
      queryParams.set('status', 'active');
      
      const response = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch upcoming registrations');
      
      const data = await response.json();
      
      // Filter for users whose subscriptions are currently active (startDate <= today <= endDate)
      const activeUsers = data.users.filter((user: any) => {
        if (!user.start || !user.end) return false;
        const startDate = new Date(user.start);
        const endDate = new Date(user.end);
        return startDate <= today && endDate >= today;
      });
      
      setUpcomingRegistrations(activeUsers);
      setUpcomingLoading(false);
    } catch (error) {
      console.error('Error fetching upcoming registrations:', error);
      setError('Error fetching upcoming data');
      setUpcomingLoading(false);
    }
  }, []);

  const fetchNewSubscriptionData = useCallback(async (viewType: 'all' | 'thisWeek' | 'upcoming') => {
    setSubscriptionsLoading(true);
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setSubscriptionsLoading(false);
        return;
      }
      
      const queryParams = new URLSearchParams();
      // Remove restrictive server-side filtering, let frontend handle view logic
      // This ensures monthly subscriptions appear in all tabs appropriately
      queryParams.set('pageSize', '1000'); // Get more records for client-side filtering
      
      const response = await fetch(`/api/admin/subscriptions?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Subscriptions API error:', response.status, errorText);
        throw new Error('Failed to fetch subscription data');
      }
      const data = await response.json();
      setSubscriptionUsers(data.subscriptions || []);
      setSubscriptionsLoading(false);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setError('Error fetching subscription data');
      setSubscriptionsLoading(false);
    }
  }, []); // Removed subscriptionView dependency

  const fetchStatistics = async () => {
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication required. Please refresh and login again.');
        return;
      }
      
      const response = await fetch('/api/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Statistics API error:', response.status, errorData);
        throw new Error(`Failed to fetch statistics: ${response.status}`);
      }
      const data = await response.json();
      
      // Defensive programming - check if data structure exists
      if (data.stats) {
        setUserStats({
          total: data.stats.total || 0,
          active: data.stats.active || 0,
          expired: data.stats.expired || 0,
          upcoming: data.stats.upcoming || 0,
        });
      }
      
      setRevenue(data.revenue || 0);
      setPaymentStats(Array.isArray(data.paymentStats) ? data.paymentStats : []);
      setPlanStats(Array.isArray(data.planStats) ? data.planStats : []);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError(`Error fetching statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Set default values to prevent crashes
      setUserStats({ total: 0, active: 0, expired: 0, upcoming: 0 });
      setRevenue(0);
      setPaymentStats([]);
      setPlanStats([]);
    }
  };

  // CSV export function
  const downloadCSV = async (isFullExport: boolean = false) => {
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        showToast('Admin authentication required', 'error');
        return;
      }

      // Build query parameters based on current filters
      const queryParams = new URLSearchParams();
      if (!isFullExport) {
        // Apply current filters only if not full export
        if (filterState.status !== 'all') queryParams.set('status', filterState.status);
        if (filterState.paymentStatus !== 'all') queryParams.set('paymentStatus', filterState.paymentStatus);
        
        if (filterState.dateRange === 'custom' && filterState.startDate && filterState.endDate) {
          queryParams.set('startDate', filterState.startDate);
          queryParams.set('endDate', filterState.endDate);
        } else if (filterState.dateRange === 'today') {
          const today = new Date();
          queryParams.set('startDate', format(today, 'yyyy-MM-dd'));
          queryParams.set('endDate', format(today, 'yyyy-MM-dd'));
        } else if (filterState.dateRange === 'thisWeek') {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          queryParams.set('startDate', format(startOfWeek, 'yyyy-MM-dd'));
          queryParams.set('endDate', format(endOfWeek, 'yyyy-MM-dd'));
        } else if (filterState.dateRange === 'thisMonth') {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          queryParams.set('startDate', format(startOfMonth, 'yyyy-MM-dd'));
          queryParams.set('endDate', format(endOfMonth, 'yyyy-MM-dd'));
        }
        
        if (filterState.source !== 'all') queryParams.set('source', filterState.source);
        if (filterState.search) queryParams.set('search', filterState.search);
      }
      
      queryParams.set('fullExport', isFullExport.toString());

      const response = await fetch(`/api/admin/export?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = isFullExport ? 'goalete-full-export.csv' : 'goalete-filtered-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`${isFullExport ? 'Full database' : 'Filtered data'} exported successfully`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('Failed to export data', 'error');
    }
  };

  // Add refresh listeners for each tab (placed after all functions are declared)
  useRefreshListener(['users', 'all'], () => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  });

  useRefreshListener(['meetings', 'calendar', 'all'], () => {
    if (activeTab === 'calendar') {
      fetchCalendarData();
    }
  });

  useRefreshListener(['subscriptions', 'all'], () => {
    if (activeTab === 'subscriptions') {
      fetchNewSubscriptionData(subscriptionView);
    }
  });

  useRefreshListener(['analytics', 'all'], () => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  });

  useRefreshListener(['all'], () => {
    if (activeTab === 'upcoming') {
      fetchUpcomingData();
    }
  });

  useEffect(() => {
    // Check if admin is authenticated before making any API calls
    const checkAuthAndFetch = async () => {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      const adminAuthenticated = sessionStorage.getItem('adminAuthenticated');
      
      if (!adminAuthenticated || !adminPasscode) {
        setError('Please ensure you are logged in as admin');
        return;
      }

      // Only fetch data for the current active tab
      if (activeTab === 'users') {
        fetchUsers();
      }
    };

    checkAuthAndFetch();
  }, [activeTab, fetchUsers]);

  // Tab-specific data fetching when switching tabs
  useEffect(() => {
    const adminPasscode = sessionStorage.getItem('adminPasscode');
    if (!adminPasscode) {
      return;
    }

    switch (activeTab) {
      case 'users':
        // Users data is handled by the filter effect below
        break;
      case 'calendar':
        fetchCalendarData();
        break;
      case 'upcoming':
        fetchUpcomingData();
        break;
      case 'subscriptions':
        fetchNewSubscriptionData(subscriptionView);
        fetchStatistics(); // Also fetch revenue and statistics for subscriptions view
        break;
      case 'analytics':
        fetchAnalytics();
        break;
    }
  }, [activeTab, fetchCalendarData, fetchUpcomingData, fetchAnalytics]); // Removed fetchNewSubscriptionData and subscriptionView

  // Filter-specific effect only for users tab
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [
    filterState.dateRange, 
    filterState.startDate, 
    filterState.endDate, 
    filterState.status, 
    filterState.source, 
    filterState.paymentStatus, 
    filterState.search, 
    sortBy, 
    sortOrder, 
    page, 
    pageSize,
    activeTab,
    fetchUsers
  ]);

  // Handle tab change with refresh mechanism
  const handleTabChange = (newTab: typeof activeTab) => {
    setActiveTab(newTab);
  };

  // Auto-refresh timer for active tab (every 5 minutes)
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      // Only auto-refresh if user is active (has interacted recently)
      const lastActivity = sessionStorage.getItem('lastAdminActivity');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (lastActivity && (now - parseInt(lastActivity)) < fiveMinutes) {
        refreshAllData();
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Track user activity
    const updateActivity = () => {
      sessionStorage.setItem('lastAdminActivity', Date.now().toString());
    };

    // Listen for user interactions
    document.addEventListener('mousedown', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('scroll', updateActivity);

    // Set initial activity
    updateActivity();

    return () => {
      clearInterval(autoRefreshInterval);
      document.removeEventListener('mousedown', updateActivity);
      document.removeEventListener('keydown', updateActivity);
      document.removeEventListener('scroll', updateActivity);
    };
  }, [refreshAllData]);

  // Handle user click to fetch detailed user data
  const handleUserClick = async (userId: string) => {
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication required');
        return;
      }

      const response = await fetch(`/api/admin/user?id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      
      // Convert the detailed user data to UserWithSubscriptions format
      const userWithSubscriptions: UserDetailModalType = {
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
        email: data.user.email,
        phone: data.user.phone,
        source: data.user.source,
        createdAt: data.user.createdAt,
        role: data.user.role,
        subscriptions: data.user.subscriptions.map((sub: any) => ({
          id: sub.id,
          planType: sub.planType,
          startDate: sub.startDate,
          endDate: sub.endDate,
          status: sub.status,
          paymentStatus: sub.paymentStatus,
          duration: sub.duration,
          price: sub.price || 0,
          orderId: sub.orderId
        }))
      };

      setSelectedUser(userWithSubscriptions);
      setShowUserDetail(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to fetch user details');
    }
  };

  // Add the actual dashboard UI here
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-sm border ${
          toast.type === 'success' 
            ? 'bg-emerald-500/90 border-emerald-400 text-white' 
            : 'bg-red-500/90 border-red-400 text-white'
        } transform transition-all duration-300 ease-out`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Manage users, meetings, and analytics with ease</p>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Last updated: {format(lastUpdated, 'HH:mm:ss')}
              </div>
            )}
            <button
              onClick={() => refreshAllData()}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={globalRefreshLoading || usersLoading || calendarLoading || upcomingLoading || subscriptionsLoading || analyticsLoading}
            >
              <svg 
                className={`w-4 h-4 ${globalRefreshLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{globalRefreshLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-2">
          <div className="flex overflow-x-auto gap-2 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'users' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => handleTabChange('users')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Users</span>
            </button>
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'calendar' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => handleTabChange('calendar')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              <span>Calendar</span>
            </button>
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'upcoming' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => handleTabChange('upcoming')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Upcoming</span>
            </button>
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'subscriptions' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => handleTabChange('subscriptions')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Subscriptions</span>
            </button>
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'analytics' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => handleTabChange('analytics')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && (
          <UsersView
            users={users}
            filteredUsers={filteredUsers}
            loading={usersLoading}
            error={error}
            userStats={userStats}
            filterState={filterState}
            sortBy={sortBy}
            sortOrder={sortOrder}
            page={page}
            pageSize={pageSize}
            total={total}
            updateFilter={updateFilter}
            setSortBy={setSortBy}
            setSortOrder={setSortOrder}
            setPage={setPage}
            setPageSize={setPageSize}
            handleRowClick={handleUserClick}
            downloadCSV={downloadCSV}
            downloadFullDBExport={() => downloadCSV(true)}
            onCreateUser={() => setShowCreateUser(true)}
          />
        )}
        
        {activeTab === 'calendar' && (
          <AdminCalendar />
        )}
        
        {activeTab === 'upcoming' && (
          <UpcomingRegistrationsView
            loading={upcomingLoading}
            upcomingMeetings={upcomingMeetings}
            upcomingRegistrations={upcomingRegistrations}
            handleRowClick={handleUserClick}
            setActiveTab={(tab: string) => handleTabChange(tab as typeof activeTab)}
          />
        )}
        
        {activeTab === 'subscriptions' && (
          <SubscriptionsView
            subscriptionView={subscriptionView}
            setSubscriptionView={(view) => {
              setSubscriptionView(view);
              fetchNewSubscriptionData(view);
            }}
            subscriptionUsers={subscriptionUsers}
            subscriptionsLoading={subscriptionsLoading}
            revenue={revenue}
            handleRowClick={handleUserClick}
          />
        )}
        
        {activeTab === 'analytics' && (
          <EarningsAnalyticsView />
        )}
      </div>

      {/* User Detail Modal */}
      {showUserDetail && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          show={showUserDetail}
          onClose={() => setShowUserDetail(false)}
          modalSortBy={"startDate"}
          modalSortOrder={"desc"}
          modalFilterStatus={"all"}
          modalFilterPayment={"all"}
          setModalFilterStatus={() => {}}
          setModalFilterPayment={() => {}}
          handleModalSort={() => {}}
          onNavigateToCalendar={() => {
            setShowUserDetail(false);
            handleTabChange('calendar');
          }}
          onUserUpdated={(updatedUser) => {
            // Update the selected user state
            setSelectedUser(updatedUser);
            // Trigger refresh for relevant data types
            triggerRefresh('users');
            triggerRefresh('subscriptions');
            showToast('User updated successfully!', 'success');
          }}
        />
      )}

      {/* Create User Modal */}
      <CreateUserModal
        show={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onUserCreated={(newUser) => {
          // Optimistically add the new user to the list
          const userWithDefaults = {
            ...newUser,
            plan: undefined,
            start: undefined,
            end: undefined,
            status: undefined,
            price: undefined,
            paymentStatus: undefined,
            role: 'user'
          };
          
          setUsers(prevUsers => [userWithDefaults, ...prevUsers]);
          setFilteredUsers(prevFiltered => [userWithDefaults, ...prevFiltered]);
          setTotal(prevTotal => prevTotal + 1);
          setUserStats(prevStats => ({
            ...prevStats,
            total: prevStats.total + 1
          }));
          
          // Trigger refresh to get accurate data
          triggerRefresh('users');
          
          setShowCreateUser(false);
          showToast('User created successfully!', 'success');
        }}
      />
    </div>
  );
}