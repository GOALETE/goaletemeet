'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import AdminCalendar from './adminviews/AdminCalendar';
import UsersView from './adminviews/UsersView';
import UserDetailModal from './adminviews/UserDetailModal';
import SubscriptionsView from './adminviews/SubscriptionsView';
import UpcomingRegistrationsView from './adminviews/UpcomingRegistrationsView';
import TodayMeetingCard from './adminviews/TodayMeetingCard';
import EarningsAnalyticsView from './adminviews/EarningsAnalyticsView';
import CronManagementView from './adminviews/CronManagementView';

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
  startTimeIST: string;
  endTimeIST: string;
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
  const [activeTab, setActiveTab] = useState<'users' | 'calendar' | 'upcoming' | 'subscriptions' | 'analytics' | 'cronManagement'>('users');
  const [subscriptionView, setSubscriptionView] = useState<'all' | 'thisWeek' | 'upcoming'>('all');
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>(initialUsers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithSubscriptions | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [upcomingRegistrations, setUpcomingRegistrations] = useState<any[]>([]);
  const [subscriptionUsers, setSubscriptionUsers] = useState<any[]>([]); // Changed to handle subscription records
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [refreshMeetingTrigger, setRefreshMeetingTrigger] = useState(0);
  
  // Filter states - simplified
  const [filterState, setFilterState] = useState({
    plan: 'all',
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

  // Stats
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    upcoming: 0,
  });
  const [revenue, setRevenue] = useState(0);
  const [paymentStats, setPaymentStats] = useState<any[]>([]);
  const [planStats, setPlanStats] = useState<any[]>([]);

  const { toast, showToast } = useToast();

  // Only one fetchUsers function, wrapped in useCallback
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Build query parameters based on current filters
    const queryParams = new URLSearchParams();
    if (filterState.plan !== 'all') queryParams.set('planType', filterState.plan);
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
        setLoading(false);
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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users data:', error);
      setError('Error fetching users data');
      setLoading(false);
    }
  }, [filterState, sortBy, sortOrder, page, pageSize]);

  // Only one fetchStatistics function
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

  // Only one fetchUpcomingMeetings function
  const fetchUpcomingMeetings = async () => {
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) return;
      
      // Get today's date in IST
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
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
      setUpcomingMeetings(data.meetings);
    } catch (error) {
      console.error('Error fetching upcoming meetings:', error);
    }
  };

  // Only one fetchUpcomingRegistrations function
  const fetchUpcomingRegistrations = async () => {
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) return;
      
      // Get active subscriptions for upcoming dates (in IST)
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      
      // Use the existing API to get all active users (including single day plans)
      const queryParams = new URLSearchParams();
      queryParams.set('status', 'active');
      // Don't filter by startDate - we want all currently active subscriptions
      
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
    } catch (error) {
      console.error('Error fetching upcoming registrations:', error);
    }
  };

  // Fetch subscription data based on view type
  const fetchSubscriptionData = async (viewType: 'all' | 'thisWeek' | 'upcoming') => {
    setSubscriptionsLoading(true);
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setSubscriptionsLoading(false);
        return;
      }
      
      const queryParams = new URLSearchParams();
      queryParams.set('viewType', viewType);
      if (viewType === 'thisWeek') {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        queryParams.set('startDate', format(startOfWeek, 'yyyy-MM-dd'));
        queryParams.set('endDate', format(endOfWeek, 'yyyy-MM-dd'));
      } else if (viewType === 'upcoming') {
        const today = new Date();
        queryParams.set('startDate', format(today, 'yyyy-MM-dd'));
      }
      
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
      setSubscriptionUsers(data.subscriptions); // Changed from data.users to data.subscriptions
      setRevenue(data.revenue); // Update revenue based on the current view
      setSubscriptionsLoading(false);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setSubscriptionsLoading(false);
    }
  };

  useEffect(() => {
    // Check if admin is authenticated before making any API calls
    const checkAuthAndFetch = async () => {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      const adminAuthenticated = sessionStorage.getItem('adminAuthenticated');
      
      if (!adminAuthenticated || !adminPasscode) {
        setError('Please ensure you are logged in as admin');
        return;
      }

      fetchUsers();
      fetchStatistics();
      fetchUpcomingMeetings();
      fetchUpcomingRegistrations();
    };

    checkAuthAndFetch();
  }, [fetchUsers]);

  useEffect(() => {
    // Only make API calls if admin is authenticated
    const adminPasscode = sessionStorage.getItem('adminPasscode');
    if (!adminPasscode) {
      return;
    }

    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'upcoming') {
      fetchUpcomingRegistrations();
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptionData(subscriptionView);
    }
  }, [
    activeTab,
    filterState.plan, 
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
    subscriptionView,
    fetchUsers
  ]);

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
              onClick={() => setActiveTab('users')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>Users</span>
            </button>
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'calendar' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => setActiveTab('calendar')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Calendar</span>
            </button>
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'cronManagement' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => setActiveTab('cronManagement')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Cron Jobs</span>
            </button>
            <button 
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'upcoming' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-gray-700 hover:bg-gray-100/70'
              }`} 
              onClick={() => setActiveTab('upcoming')}
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
              onClick={() => setActiveTab('subscriptions')}
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
              onClick={() => setActiveTab('analytics')}
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
            loading={loading}
            error={error}
            userStats={userStats}
            revenue={revenue}
            filterState={filterState}
            sortBy={sortBy}
            sortOrder={sortOrder}
            page={page}
            pageSize={pageSize}
            total={total}
            updateFilter={(key, value) => setFilterState((prev: any) => ({ ...prev, [key]: value }))}
            setSortBy={setSortBy}
            setSortOrder={setSortOrder}
            setPage={setPage}
            setPageSize={setPageSize}
            handleRowClick={userId => { const user = users.find(u => u.id === userId); setSelectedUser(user ? user as UserWithSubscriptions : null); setShowUserDetail(true); }}
            downloadCSV={() => {}}
            downloadFullDBExport={() => {}}
          />
        )}
        
        {activeTab === 'calendar' && (
          <AdminCalendar />
        )}
        
        {activeTab === 'upcoming' && (
          <UpcomingRegistrationsView
            loading={loading}
            upcomingMeetings={upcomingMeetings}
            upcomingRegistrations={upcomingRegistrations}
            handleRowClick={userId => { const user = users.find(u => u.id === userId); setSelectedUser(user ? user as UserWithSubscriptions : null); setShowUserDetail(true); }}
            setActiveTab={(tab: string) => setActiveTab(tab as typeof activeTab)}
          />
        )}
        
        {activeTab === 'subscriptions' && (
          <SubscriptionsView
            subscriptionView={subscriptionView}
            setSubscriptionView={setSubscriptionView}
            subscriptionUsers={subscriptionUsers}
            subscriptionsLoading={subscriptionsLoading}
            revenue={revenue}
            handleRowClick={userId => { const user = users.find(u => u.id === userId); setSelectedUser(user ? user as UserWithSubscriptions : null); setShowUserDetail(true); }}
          />
        )}
        
        {activeTab === 'analytics' && (
          <EarningsAnalyticsView />
        )}
        
        {activeTab === 'cronManagement' && (
          <CronManagementView />
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
            setActiveTab('calendar');
          }}
        />
      )}
    </div>
  );
}