import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import AdminCalendar from './AdminCalendar';
import UsersView from './adminviews/UsersView';
import UserDetailModal from './adminviews/UserDetailModal';
import SessionUsersView from './adminviews/SessionUsersView';
import SubscriptionsView from './adminviews/SubscriptionsView';
import UpcomingRegistrationsView from './adminviews/UpcomingRegistrationsView';
import TodayMeetingCard from './adminviews/TodayMeetingCard';

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
  const [activeTab, setActiveTab] = useState<'users' | 'calendar' | 'upcoming' | 'subscriptions' | 'sessionUsers'>('users');
  const [subscriptionView, setSubscriptionView] = useState<'all' | 'thisWeek' | 'upcoming'>('all');
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>(initialUsers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');  const [selectedUser, setSelectedUser] = useState<UserWithSubscriptions | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [upcomingRegistrations, setUpcomingRegistrations] = useState<any[]>([]);
  const [subscriptionUsers, setSubscriptionUsers] = useState<UserData[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [sessionDate, setSessionDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [sessionUsers, setSessionUsers] = useState<any[]>([]);  const [sessionUsersLoading, setSessionUsersLoading] = useState(false);
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
      // Log query parameters for debugging
      console.log('Fetching users with query params:', Object.fromEntries(queryParams.entries()));
      
      const response = await fetch(`/api/admin/users?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data = await response.json();
      console.log('User data received:', data);
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
      const response = await fetch('/api/admin/statistics');
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const data = await response.json();
      setUserStats({
        total: data.stats.total,
        active: data.stats.active,
        expired: data.stats.expired,
        upcoming: data.stats.upcoming,
      });
      setRevenue(data.revenue);
      setPaymentStats(data.paymentStats);
      setPlanStats(data.planStats);
    } catch (error) {
      setError('Error fetching statistics');
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
      // Get active subscriptions for upcoming dates (in IST)
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const startDateStr = format(today, 'yyyy-MM-dd');
      
      // Use the existing API to get upcoming registrations
      const queryParams = new URLSearchParams();
      queryParams.set('status', 'active');
      queryParams.set('startDate', startDateStr);
      
      const response = await fetch(`/api/admin/users?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch upcoming registrations');
      
      const data = await response.json();
      setUpcomingRegistrations(data.users);
    } catch (error) {
      console.error('Error fetching upcoming registrations:', error);
    }
  };

  // Fetch subscription data based on view type
  const fetchSubscriptionData = async (viewType: 'all' | 'thisWeek' | 'upcoming') => {
    setSubscriptionsLoading(true);
    try {
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
      const response = await fetch(`/api/admin/subscriptions?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch subscription data');
      const data = await response.json();
      setSubscriptionUsers(data.users);
      setRevenue(data.revenue); // Update revenue based on the current view
      setSubscriptionsLoading(false);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setSubscriptionsLoading(false);
    }
  };

  // Fetch users for a given session date
  const fetchSessionUsers = async (date: string) => {
    setSessionUsersLoading(true);
    try {
      const response = await fetch(`/api/admin/session-users?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch session users');
      const data = await response.json();
      setSessionUsers(data.users);
    } catch (error) {
      setSessionUsers([]);
    }
    setSessionUsersLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    fetchStatistics();
    fetchUpcomingMeetings();
    fetchUpcomingRegistrations();
    // Store admin passcode in session storage for API calls
    const adminAuthenticated = sessionStorage.getItem('adminAuthenticated');
    if (adminAuthenticated === 'true') {
      const adminPasscode = process.env.ADMIN_PASSCODE || 'adminGoaleteM33t2025!';
      sessionStorage.setItem('adminPasscode', adminPasscode);
    }
  }, [fetchUsers]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'upcoming') {
      fetchUpcomingRegistrations();
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptionData(subscriptionView);
    } else if (activeTab === 'sessionUsers') {
      fetchSessionUsers(sessionDate);
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
    sessionDate,
    fetchUsers
  ]);

  // Add the actual dashboard UI here
  return (
    <div className="admin-dashboard-container p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('calendar')}>Calendar</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('upcoming')}>Upcoming Registrations</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'subscriptions' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('subscriptions')}>Subscriptions</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'sessionUsers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('sessionUsers')}>Session Users</button>
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
            updateFilter={(key, value) => setFilterState((prev: any) => ({ ...prev, [key]: value }))
            }
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
        {activeTab === 'sessionUsers' && (
          <SessionUsersView
            sessionDate={sessionDate}
            setSessionDate={setSessionDate}
            sessionUsers={sessionUsers}
            sessionUsersLoading={sessionUsersLoading}
          />
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
        />
      )}
    </div>
  );
}