import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

// Helper function to check if a date is today
const isToday = (dateString: string): boolean => {
  if (!dateString) return false;
  const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const today = istDate.toISOString().split('T')[0];
  return dateString === today;
};

// Helper function to format date with "Today" if it's today
const formatSessionDate = (dateString: string): string => {
  if (isToday(dateString)) {
    return 'Today';
  }
  return format(new Date(dateString), 'MMM d, yyyy');
};

// Define the filter state keys as a type
export type FilterStateKey =
  | 'dateRange'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'source'
  | 'paymentStatus'
  | 'search'
  | 'showExpiringSoon';

// Define the props interface matching AdminDashboard usage
interface UsersViewProps {
  users: any[];
  filteredUsers: any[];
  loading: boolean;
  error: string;
  userStats: any;
  revenue: number;
  filterState: any;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  total: number;
  updateFilter: (key: FilterStateKey, value: string | boolean) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handleRowClick: (userId: string) => void;
  downloadCSV: (all?: boolean) => void;
  downloadFullDBExport: () => void;
  onCreateUser: () => void;
}

const UsersView: React.FC<UsersViewProps> = ({
  users,
  filteredUsers,
  loading,
  error,
  userStats,
  revenue,
  filterState,
  sortBy,
  sortOrder,
  page,
  pageSize,
  total,
  updateFilter,
  setSortBy,
  setSortOrder,
  setPage,
  setPageSize,
  handleRowClick,
  downloadCSV,
  downloadFullDBExport,
  onCreateUser
}) => {
  const [searchInput, setSearchInput] = useState(filterState.search || '');

  // Debounce search input
  const debouncedUpdateSearch = useCallback(
    (value: string) => {
      const timeoutId = setTimeout(() => {
        updateFilter('search', value);
      }, 500); // 500ms delay
      
      return () => clearTimeout(timeoutId);
    },
    [updateFilter]
  );

  useEffect(() => {
    const cleanup = debouncedUpdateSearch(searchInput);
    return cleanup;
  }, [searchInput, debouncedUpdateSearch]);
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-medium text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-blue-800 mb-1">Total Users</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{userStats.total}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-emerald-800 mb-1">Active</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-800 bg-clip-text text-transparent">{userStats.active}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-pink-100 backdrop-blur-sm rounded-2xl shadow-xl border border-red-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-1">Expired</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">{userStats.expired}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-100 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 p-6 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-purple-800 mb-1">Revenue</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-800 bg-clip-text text-transparent">₹{revenue}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
          <span>Filters & Search</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white"
              value={filterState.status}
              onChange={(e) => updateFilter('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Status</label>
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white"
              value={filterState.paymentStatus}
              onChange={(e) => updateFilter('paymentStatus', e.target.value)}
            >
              <option value="all">All Payments</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                className="w-full p-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white"
                placeholder="Name, email, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => downloadCSV()}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Users Database</span>
            </h3>
            
            <button
              onClick={onCreateUser}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create New User</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/50">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200 rounded-tl-xl"
                    onClick={() => {
                      if (sortBy === 'firstName') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('firstName');
                        setSortOrder('asc');
                      }
                    }}>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Name {sortBy === 'firstName' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email</span>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Source</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider rounded-tr-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Registration Date</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-gray-200/30">
              {filteredUsers.map((user, index) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 cursor-pointer transition-all duration-300 transform hover:scale-[1.01]"
                  onClick={() => handleRowClick(user.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index % 4 === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        index % 4 === 1 ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                        index % 4 === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-600' :
                        'bg-gradient-to-r from-pink-500 to-rose-600'
                      }`}>
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                          {(user.role === 'superuser' || user.role === 'ADMIN') && (
                            <div className="px-2 py-0.5 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-full">
                              <span className="text-blue-700 font-bold text-xs">UNLIMITED</span>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{user.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm flex items-center space-x-1 w-fit ${
                      user.hasActiveOrUpcomingSubscriptions ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-300/50' :
                      'bg-gradient-to-r from-red-100 to-pink-200 text-red-800 border border-red-300/50'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        user.hasActiveOrUpcomingSubscriptions ? 'bg-emerald-500' : 'bg-red-500'
                      }`}></div>
                      <span>{user.hasActiveOrUpcomingSubscriptions ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                      user.source === 'google' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300/50' :
                      user.source === 'facebook' ? 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border border-indigo-300/50' :
                      user.source === 'whatsapp' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300/50' :
                      user.source === 'instagram' ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800 border border-pink-300/50' :
                      user.source === 'linkedin' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300/50' :
                      user.source === 'referral' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300/50' :
                      'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300/50'
                    }`}>
                      {user.source || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 font-medium">
              Showing <span className="font-bold text-indigo-600">{((page - 1) * pageSize) + 1}</span> to <span className="font-bold text-indigo-600">{Math.min(page * pageSize, total)}</span> of <span className="font-bold text-indigo-600">{total}</span> results
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>
              <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg font-bold">
                Page {page} of {Math.ceil(total / pageSize)}
              </div>
              <button
                onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
              >
                <span>Next</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
