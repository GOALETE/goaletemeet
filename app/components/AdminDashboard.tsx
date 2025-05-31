import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

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
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>(initialUsers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithSubscriptions | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  
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
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [
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
        {/* Filters */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
              <select
                value={filterState.plan}
                onChange={(e) => updateFilter('plan', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Plans</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filterState.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            {filterState.dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filterState.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filterState.endDate}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterState.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={filterState.paymentStatus}
                onChange={(e) => updateFilter('paymentStatus', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                value={filterState.source}
                onChange={(e) => updateFilter('source', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Sources</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="email">Email</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filterState.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search by name, email, or phone"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center gap-1 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filterState.showExpiringSoon} 
                  onChange={e => updateFilter('showExpiringSoon', e.target.checked)} 
                  className="accent-blue-600" 
                />
                <span>Show Only Expiring Soon (7 days)</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Search and Pagination Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
          <div className="flex gap-2">
            <button 
              onClick={() => updateFilter('dateRange', 'today')} 
              className={`px-3 py-1 border rounded ${filterState.dateRange === 'today' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
            >
              Today
            </button>
            <button 
              onClick={() => updateFilter('dateRange', 'thisWeek')} 
              className={`px-3 py-1 border rounded ${filterState.dateRange === 'thisWeek' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
            >
              This Week
            </button>
            <button 
              onClick={() => updateFilter('dateRange', 'thisMonth')} 
              className={`px-3 py-1 border rounded ${filterState.dateRange === 'thisMonth' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
            >
              This Month
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)} 
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {page} of {Math.ceil(total / pageSize) || 1}</span>
            <button 
              disabled={page * pageSize >= total} 
              onClick={() => setPage(page + 1)} 
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} 
              className="ml-2 p-1 border rounded"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Export buttons */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => downloadCSV(false)}
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition mr-2"
          >
            Export Current Page
          </button>
          <button
            onClick={() => downloadCSV(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Export All Filtered
          </button>
        </div>
        
        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded shadow">
            <div className="spinner mx-auto h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2">Loading data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 bg-white rounded shadow">{error}</div>
        ) : (
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} 
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      User {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      onClick={() => { setSortBy('email'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} 
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Email {sortBy === 'email' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th 
                      onClick={() => { setSortBy('createdAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} 
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Created At {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        onClick={() => handleRowClick(user.id)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.source}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.plan || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.createdAt ? format(new Date(user.createdAt), 'yyyy-MM-dd') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.start ? format(new Date(user.start), 'yyyy-MM-dd') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.end ? format(new Date(user.end), 'yyyy-MM-dd') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.price !== undefined && user.price !== null ? `₹${user.price}` : 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found matching your filters
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={2} className="px-6 py-3">Summary</td>
                    <td className="px-6 py-3">{filteredUsers.length} users</td>
                    <td colSpan={6} className="px-6 py-3">Active: {userStats.active} | Expired: {userStats.expired} | Upcoming: {userStats.upcoming}</td>
                  </tr>
                </tfoot>
              </table>
              {/* Back to Top button */}
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg z-40"
              >
                ↑
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* User Detail Modal */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                <button 
                  onClick={handleCloseDetail}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <div className="flex items-center gap-2">
                    <p>{selectedUser.email}</p>
                    <button 
                      onClick={() => {navigator.clipboard.writeText(selectedUser.email); showToast('Email copied!', 'success');}} 
                      className="text-xs px-2 py-1 border rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">User ID</h3>
                  <div className="flex items-center gap-2">
                    <p>{selectedUser.id}</p>
                    <button 
                      onClick={() => {navigator.clipboard.writeText(selectedUser.id); showToast('User ID copied!', 'success');}} 
                      className="text-xs px-2 py-1 border rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p>{selectedUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Source</h3>
                  <p>{selectedUser.source || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                  <p>{selectedUser.createdAt ? format(new Date(selectedUser.createdAt), 'yyyy-MM-dd') : 'N/A'}</p>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-4">Subscription History</h3>
              {selectedUser.subscriptions && selectedUser.subscriptions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedUser.subscriptions.map((sub) => {
                        const today = new Date();
                        const startDate = new Date(sub.startDate);
                        const endDate = new Date(sub.endDate);
                        let timeStatus = '';
                        if (startDate > today) timeStatus = 'Upcoming';
                        else if (endDate < today) timeStatus = 'Expired';
                        else timeStatus = 'Current';
                        
                        return (
                          <tr key={sub.id} className={
                            timeStatus === 'Current' ? 'bg-green-50' : 
                            timeStatus === 'Expired' ? 'bg-red-50' : 
                            'bg-blue-50'
                          }>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{sub.planType}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {format(new Date(sub.startDate), 'yyyy-MM-dd')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {format(new Date(sub.endDate), 'yyyy-MM-dd')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {sub.duration || 'N/A'} days
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {sub.status}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">({timeStatus})</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                sub.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {sub.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {sub.price !== undefined && sub.price !== null ? `₹${sub.price}` : 'N/A'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No subscription history found</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Payment and Plan Breakdown */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-2">Payment Status Breakdown</h3>
          {paymentStats.length > 0 ? (
            <ul className="space-y-2">
              {paymentStats.map((stat: any) => (
                <li key={stat.paymentStatus} className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded ${
                    stat.paymentStatus === 'completed' ? 'bg-green-100' : 
                    stat.paymentStatus === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {stat.paymentStatus || 'Unknown'}
                  </span>
                  <span className="font-medium">{stat._count._all}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No payment data available</p>
          )}
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-2">Plan Type Breakdown</h3>
          {planStats.length > 0 ? (
            <ul className="space-y-2">
              {planStats.map((stat: any) => (
                <li key={stat.planType} className="flex justify-between items-center">
                  <span className="px-2 py-1 bg-blue-100 rounded">{stat.planType}</span>
                  <span className="font-medium">{stat._count._all}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No plan data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
