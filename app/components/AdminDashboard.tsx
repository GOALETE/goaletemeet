import { useState, useEffect, useRef } from 'react';
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
  }, []);

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
    sessionDate
  ]);

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
  const fetchUsers = async () => {
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
  };
  
  useEffect(() => {
    if (filterState.showExpiringSoon) {
      const expiringSoonUsers = filterExpiringSoon(users);
      setFilteredUsers(expiringSoonUsers);
    } else {
      setFilteredUsers(users);
    }
  }, [users, filterState.showExpiringSoon]);

  // Filter expiring soon (within 7 days)
  const filterExpiringSoon = (users: UserData[]) => {
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + 7);
    return users.filter(user => user.end && new Date(user.end) > today && new Date(user.end) <= soon);
  };

  const fetchUserDetails = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      const data = await response.json();
      setSelectedUser(data.user);
      setShowUserDetail(true);
      setLoading(false);
    } catch (error) {
      setError('Error fetching user details');
      setLoading(false);
    }
  };

  const handleRowClick = (userId: string) => {
    fetchUserDetails(userId);
  };

  const handleCloseDetail = () => {
    setShowUserDetail(false);
    setSelectedUser(null);
  };
  // Export options
  const downloadCSV = (all: boolean = false) => {
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
    if (!all) {
      queryParams.set('page', String(page));
      queryParams.set('pageSize', String(pageSize));
    }
    window.location.href = `/api/admin/export?${queryParams.toString()}`;
  };
    // Download entire database export filtered by active and paid
  const downloadFullDBExport = () => {
    const queryParams = new URLSearchParams();
    queryParams.set('status', 'active');
    queryParams.set('paymentStatus', 'completed');
    queryParams.set('fullExport', 'true');
    window.location.href = `/api/admin/export?${queryParams.toString()}`;
  };
  
  // Export current subscription view
  const exportSubscriptionView = () => {
    const queryParams = new URLSearchParams();
    queryParams.set('viewType', subscriptionView);
    
    if (subscriptionView === 'thisWeek') {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      queryParams.set('startDate', format(startOfWeek, 'yyyy-MM-dd'));
      queryParams.set('endDate', format(endOfWeek, 'yyyy-MM-dd'));
    } else if (subscriptionView === 'upcoming') {
      const today = new Date();
      queryParams.set('startDate', format(today, 'yyyy-MM-dd'));
    }
    
    window.location.href = `/api/admin/export?${queryParams.toString()}&status=active&paymentStatus=completed`;
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

  // Clear all filters
  const clearFilters = () => {
    setFilterState({
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
    setPage(1);
  };

  // Copy all emails
  const copyAllEmails = () => {
    const emails = filteredUsers.map(u => u.email).join(', ');
    navigator.clipboard.writeText(emails);
    showToast('All emails copied!', 'success');
  };
  
  // Update a single filter value
  const updateFilter = (key: keyof typeof filterState, value: string | boolean) => {
    setFilterState(prev => ({
      ...prev,
      [key]: value
    }));
    setPage(1);
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

  // Fetch users for today on mount or when sessionDate changes
  useEffect(() => {
    if (activeTab === 'sessionUsers') {
      fetchSessionUsers(sessionDate);
    }
  }, [activeTab, sessionDate]);

  // --- Modal subscription table state and logic ---
  // Place these hooks and functions inside AdminDashboard, before the return statement
  const [modalSortBy, setModalSortBy] = useState<keyof Subscription>('startDate');
  const [modalSortOrder, setModalSortOrder] = useState<'asc' | 'desc'>('desc');
  const [modalFilterStatus, setModalFilterStatus] = useState<string>('all');
  const [modalFilterPayment, setModalFilterPayment] = useState<string>('all');

  const handleModalSort = (field: keyof Subscription) => {
    if (modalSortBy === field) {
      setModalSortOrder(modalSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setModalSortBy(field);
      setModalSortOrder('asc');
    }
  };
  // Handle user updates from the modal
  const handleUserUpdated = (updatedUser: any) => {
    // Update the selected user
    setSelectedUser(updatedUser);

    // Update user in the main list
    const updatedUsers = users.map(user => 
      user.id === updatedUser.id 
        ? { ...user, role: updatedUser.role } 
        : user
    );
    setUsers(updatedUsers);
    setFilteredUsers(updatedUsers);

    // Show success toast
    showToast(`User ${updatedUser.name || updatedUser.email} updated successfully`);
    
    // Refresh data
    fetchUsers();
  };

  const filteredAndSortedSubscriptions = selectedUser?.subscriptions
    ? selectedUser.subscriptions
        .filter(sub =>
          (modalFilterStatus === 'all' || sub.status === modalFilterStatus) &&
          (modalFilterPayment === 'all' || sub.paymentStatus === modalFilterPayment)
        )
        .slice()
        .sort((a, b) => {
          let aValue: any;
          let bValue: any;
          switch (modalSortBy) {
            case 'planType':
            case 'orderId':
            case 'status':
            case 'paymentStatus':
              aValue = a[modalSortBy] || '';
              bValue = b[modalSortBy] || '';
              break;
            case 'startDate':
            case 'endDate':
              aValue = a[modalSortBy] ? new Date(a[modalSortBy] as string).getTime() : 0;
              bValue = b[modalSortBy] ? new Date(b[modalSortBy] as string).getTime() : 0;
              break;
            case 'duration':
            case 'price':
              aValue = a[modalSortBy] ?? 0;
              bValue = b[modalSortBy] ?? 0;
              break;
            default:
              aValue = '';
              bValue = '';
          }
          if (aValue < bValue) return modalSortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return modalSortOrder === 'asc' ? 1 : -1;
          return 0;
        })
    : [];
  
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 z-50 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      
      {/* Header with title and quick actions */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-wrap justify-between items-center">
          <h1 className="text-2xl font-semibold">GOALETE Admin Dashboard</h1>
          <div className="flex gap-2">
            <button 
              onClick={clearFilters} 
              className="px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 transition"
            >
              Clear Filters
            </button>
            <button 
              onClick={copyAllEmails} 
              className="px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 transition"
            >
              Copy Emails
            </button>
          </div>
        </div>
      </div>
        {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'upcoming'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Registrations
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'subscriptions'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('subscriptions')}
          >
            Subscriptions Dashboard
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'calendar'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('calendar')}
          >
            Meeting Calendar
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'sessionUsers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('sessionUsers')}
          >
            Session Users
          </button>
        </div>
      </div>
      
      {/* Today's Meeting Card - Always visible at the top */}
      <div className="mt-4 px-4">
        <TodayMeetingCard refreshTrigger={refreshMeetingTrigger} />
      </div>

      {/* Conditional rendering based on active tab */}
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
          updateFilter={updateFilter}
          setSortBy={setSortBy}
          setSortOrder={setSortOrder}
          setPage={setPage}
          setPageSize={setPageSize}
          handleRowClick={handleRowClick}
          downloadCSV={downloadCSV}
          downloadFullDBExport={downloadFullDBExport}
        />
      )}
        {activeTab === 'calendar' && (
        <AdminCalendar />
      )}
      
      {activeTab === 'subscriptions' && (
        <SubscriptionsView
          subscriptionView={subscriptionView}
          setSubscriptionView={setSubscriptionView}
          subscriptionUsers={subscriptionUsers}
          subscriptionsLoading={subscriptionsLoading}
          revenue={revenue}
          handleRowClick={handleRowClick}
        />
      )}
      
      {activeTab === 'upcoming' && (
        <UpcomingRegistrationsView
          loading={loading}
          upcomingMeetings={upcomingMeetings}
          upcomingRegistrations={upcomingRegistrations}
          handleRowClick={handleRowClick}
          setActiveTab={(tab) => setActiveTab(tab as typeof activeTab)}
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
      
      {/* User detail modal */}
      {showUserDetail && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          show={true}
          onClose={handleCloseDetail}
          modalSortBy={modalSortBy}
          modalSortOrder={modalSortOrder}
          modalFilterStatus={modalFilterStatus}
          modalFilterPayment={modalFilterPayment}
          setModalFilterStatus={setModalFilterStatus}
          setModalFilterPayment={setModalFilterPayment}
          handleModalSort={handleModalSort}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
}
