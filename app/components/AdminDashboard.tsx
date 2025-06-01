import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import AdminCalendar from './AdminCalendar';

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
  const [activeTab, setActiveTab] = useState<'users' | 'calendar' | 'upcoming'>('users');
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>(initialUsers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithSubscriptions | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [upcomingRegistrations, setUpcomingRegistrations] = useState<any[]>([]);
  
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
    pageSize
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
      setUpcomingMeetings(data.meetings);
    } catch (error) {
      console.error('Error fetching upcoming meetings:', error);
    }
  };
  
  const fetchUpcomingRegistrations = async () => {
    try {
      // Get active subscriptions for upcoming dates
      const today = new Date();
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
      const response = await fetch(`/api/admin/users?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
      setTotal(data.total);
      setLoading(false);
    } catch (error) {
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
              activeTab === 'calendar'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('calendar')}
          >
            Meeting Calendar
          </button>
        </div>
      </div>

      {/* Conditional rendering based on active tab */}
      {activeTab === 'users' && (
        <>
          {/* Stats Cards */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div 
              className="bg-white p-4 rounded shadow hover:shadow-md transition cursor-pointer" 
              onClick={() => updateFilter('status', 'all')}
            > 
              <h3 className="text-lg font-semibold">Total Users</h3>
              <p className="text-3xl font-bold">{userStats.total}</p>
            </div>
            <div 
              className="bg-white p-4 rounded shadow hover:shadow-md transition cursor-pointer border-l-4 border-emerald-500" 
              onClick={() => updateFilter('status', 'active')}
            >
              <h3 className="text-lg font-semibold">Active</h3>
              <p className="text-3xl font-bold text-emerald-600">{userStats.active}</p>
            </div>
            <div 
              className="bg-white p-4 rounded shadow hover:shadow-md transition cursor-pointer border-l-4 border-rose-500" 
              onClick={() => updateFilter('status', 'expired')}
            >
              <h3 className="text-lg font-semibold">Expired</h3>
              <p className="text-3xl font-bold text-rose-600">{userStats.expired}</p>
            </div>
            <div 
              className="bg-white p-4 rounded shadow hover:shadow-md transition cursor-pointer border-l-4 border-blue-500" 
              onClick={() => updateFilter('status', 'upcoming')}
            >
              <h3 className="text-lg font-semibold">Upcoming</h3>
              <p className="text-3xl font-bold text-blue-600">{userStats.upcoming}</p>
            </div>
            <div className="bg-white p-4 rounded shadow hover:shadow-md transition border-l-4 border-yellow-500">
              <h3 className="text-lg font-semibold">Revenue</h3>
              <p className="text-3xl font-bold text-yellow-600">₹{revenue}</p>
            </div>
          </div>
          
          {/* Main content area with filters and table */}
          <div className="p-4">
            {/* ... Your existing users view code ... */}
          </div>
        </>
      )}
      
      {activeTab === 'calendar' && (
        <AdminCalendar />
      )}
      
      {activeTab === 'upcoming' && (
        <div className="p-4">
          <div className="bg-white p-4 rounded shadow mb-4">
            <h2 className="text-xl font-semibold mb-4">Upcoming Registrations</h2>
            
            {/* Upcoming meetings summary */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Scheduled Meetings</h3>
              {upcomingMeetings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {upcomingMeetings.slice(0, 3).map(meeting => (
                    <div key={meeting.id} className="bg-gray-50 p-3 rounded border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">{format(new Date(meeting.meetingDate), 'MMM dd, yyyy')}</span>
                        <span className={`text-xs px-2 py-1 rounded ${meeting.platform === 'google-meet' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {meeting.platform === 'google-meet' ? 'Google Meet' : 'Zoom'}
                        </span>
                      </div>
                      <p className="text-sm mb-1">{meeting.meetingTitle}</p>
                      <p className="text-xs text-gray-600">Time: {format(new Date(meeting.startTimeIST), 'h:mm a')} IST</p>
                      <div className="mt-2">
                        <a 
                          href={meeting.meetingLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Meeting Link
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No upcoming meetings scheduled.</p>
              )}
              
              {upcomingMeetings.length > 3 && (
                <button 
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setActiveTab('calendar')}
                >
                  View all {upcomingMeetings.length} meetings
                </button>
              )}
            </div>
            
            {/* Registrations Table */}
            <div className="overflow-x-auto">
              <h3 className="text-lg font-medium mb-2">Registered Users</h3>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : upcomingRegistrations.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {upcomingRegistrations.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.plan}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.start ? format(new Date(user.start), 'yyyy-MM-dd') : 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.end ? format(new Date(user.end), 'yyyy-MM-dd') : 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleRowClick(user.id)} 
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No upcoming registrations found.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* User detail modal */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseDetail}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              {/* ... Your existing user detail modal code ... */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
