import React from 'react';
import { format } from 'date-fns';
import AddUserToMeetingModal from './AddUserToMeetingModal';

export type Subscription = {
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

export type UserWithSubscriptions = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone: string;
  source: string;
  createdAt: string;
  role?: string;
  subscriptions: Subscription[];
};

interface UserDetailModalProps {
  user: UserWithSubscriptions;
  show: boolean;
  onClose: () => void;
  modalSortBy: keyof Subscription;
  modalSortOrder: 'asc' | 'desc';
  modalFilterStatus: string;
  modalFilterPayment: string;
  setModalFilterStatus: (status: string) => void;
  setModalFilterPayment: (status: string) => void;
  handleModalSort: (field: keyof Subscription) => void;
  onUserUpdated?: (updatedUser: UserWithSubscriptions) => void;
  onNavigateToCalendar?: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  show,
  onClose,
  modalSortBy,
  modalSortOrder,
  modalFilterStatus,
  modalFilterPayment,
  setModalFilterStatus,
  setModalFilterPayment,
  handleModalSort,
  onUserUpdated,
  onNavigateToCalendar,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [showAddToMeeting, setShowAddToMeeting] = React.useState(false);

  if (!show || !user) return null;

  // Determine user name based on available properties
  const userName = user.name || 
                  (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 
                  user.firstName || user.email.split('@')[0]);
  // Format subscription date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  // Calculate summary info
  const totalSpent = user.subscriptions?.reduce((sum, sub) => sum + (sub.price || 0), 0);
  const activeSubs = user.subscriptions?.filter(sub => 
    sub.status === 'active' || 
    (new Date(sub.endDate) > new Date())
  ).length || 0;  // Function to grant superuser status
  const handleGrantSuperuser = async () => {
    if (window.confirm('Are you sure you want to grant superuser status to this user? This will give them unlimited access without requiring payment.')) {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      try {
        const adminPasscode = sessionStorage.getItem('adminPasscode');
        if (!adminPasscode) {
          throw new Error('Admin authentication required');
        }

        const response = await fetch(`/api/admin/user`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminPasscode}`
          },
          body: JSON.stringify({
            userId: user.id,
            grantSuperUser: true,
            createInfiniteSubscription: true
          })
        });if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update user');
        }

        const data = await response.json();
        setSuccessMessage('Successfully granted superuser status');
        
        // If a callback was provided, call it with the updated user from the response
        if (onUserUpdated && data.user) {
          onUserUpdated(data.user);
        } else if (onUserUpdated) {
          // Fallback to previous behavior if user not returned
          onUserUpdated({
            ...user,
            role: 'ADMIN'
          });
        }
      } catch (error) {
        console.error('Error granting superuser status:', error);
        setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
        // Clear messages after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
          setErrorMessage('');
        }, 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200/50 px-8 py-6 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              User Details
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* User Info Section */}
          <div className="p-8 border-b border-gray-200/50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">User Information</h3>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{userName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{user.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Source</p>
              <p className="font-medium">{user.source || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Joined Date</p>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Subscription Count</p>
              <p className="font-medium">{user.subscriptions?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium">{user.role === 'superuser' 
                ? <span className="text-blue-600 font-bold">Superuser</span> 
                : (user.role || 'regular')}</p>
            </div>
          </div>
        </div>

        {/* --- User Summary Section --- */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="mb-2 text-lg font-semibold text-gray-700">Summary</div>          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="font-medium">₹{totalSpent}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Subscriptions</p>
              <p className="font-medium">{activeSubs}</p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {user.role !== 'superuser' && (
              <button 
                onClick={handleGrantSuperuser}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Grant Unlimited Access</span>
                  </>
                )}
              </button>
            )}
            <button 
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit User</span>
            </button>
          </div>
          <div className="flex items-center space-x-3">
            {successMessage && (
              <div className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-300 text-emerald-800 rounded-xl font-medium flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 text-red-800 rounded-xl font-medium flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Subscription Filters */}
        {user.subscriptions?.length > 0 && (
          <>
            <div className="px-8 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200/50">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-800">Subscription Filters</h4>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status:</label>
                  <select 
                    value={modalFilterStatus}
                    onChange={(e) => setModalFilterStatus(e.target.value)}
                    className="p-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white text-sm font-medium"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment:</label>
                  <select 
                    value={modalFilterPayment}
                    onChange={(e) => setModalFilterPayment(e.target.value)}
                    className="p-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white text-sm font-medium"
                  >
                    <option value="all">All Payments</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Subscriptions Table */}
            <div className="px-8 py-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200"
                        onClick={() => handleModalSort('planType')}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Plan Type</span>
                          {modalSortBy === 'planType' && (
                            <span className="text-indigo-600">{modalSortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200"
                        onClick={() => handleModalSort('startDate')}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Start Date</span>
                          {modalSortBy === 'startDate' && (
                            <span className="text-indigo-600">{modalSortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200"
                        onClick={() => handleModalSort('endDate')}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>End Date</span>
                          {modalSortBy === 'endDate' && (
                            <span className="text-indigo-600">{modalSortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200"
                        onClick={() => handleModalSort('status')}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                          {modalSortBy === 'status' && (
                            <span className="text-indigo-600">{modalSortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200"
                        onClick={() => handleModalSort('paymentStatus')}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <span>Payment</span>
                          {modalSortBy === 'paymentStatus' && (
                            <span className="text-indigo-600">{modalSortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-all duration-200"
                        onClick={() => handleModalSort('price')}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <span>Price</span>
                          {modalSortBy === 'price' && (
                            <span className="text-indigo-600">{modalSortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>Order ID</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {user.subscriptions
                      ?.filter(sub => 
                        (modalFilterStatus === 'all' || sub.status === modalFilterStatus) &&
                        (modalFilterPayment === 'all' || sub.paymentStatus === modalFilterPayment)
                      )
                      .sort((a, b) => {
                        // Add sorting logic based on modalSortBy and modalSortOrder
                        let comparison = 0;
                        if (modalSortBy === 'startDate' || modalSortBy === 'endDate') {
                          comparison = new Date(a[modalSortBy]).getTime() - new Date(b[modalSortBy]).getTime();
                        } else if (modalSortBy === 'price' || modalSortBy === 'duration') {
                          comparison = (a[modalSortBy] || 0) - (b[modalSortBy] || 0);
                        } else {
                          comparison = String(a[modalSortBy]).localeCompare(String(b[modalSortBy]));
                        }
                        return modalSortOrder === 'asc' ? comparison : -comparison;
                      })
                      .map((sub, index) => (
                        <tr key={sub.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              sub.planType === 'monthly' ? 'bg-blue-100 text-blue-800' :
                              sub.planType === 'single-day' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {sub.planType}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatDate(sub.startDate)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatDate(sub.endDate)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center space-x-1 w-fit ${
                              sub.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 
                              sub.status === 'expired' ? 'bg-gray-100 text-gray-800' : 
                              sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                sub.status === 'active' ? 'bg-emerald-500' : 
                                sub.status === 'expired' ? 'bg-gray-500' : 
                                sub.status === 'pending' ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}></div>
                              <span>{sub.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center space-x-1 w-fit ${
                              sub.paymentStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
                              sub.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                sub.paymentStatus === 'completed' ? 'bg-emerald-500' : 
                                sub.paymentStatus === 'pending' ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}></div>
                              <span>{sub.paymentStatus}</span>
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            ₹{sub.price || 0}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                            {sub.orderId}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {user.subscriptions?.filter(sub => 
                  (modalFilterStatus === 'all' || sub.status === modalFilterStatus) &&
                  (modalFilterPayment === 'all' || sub.paymentStatus === modalFilterPayment)
                ).length === 0 && (
                  <div className="py-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-gray-500 font-medium">No subscriptions match the current filters</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {user.subscriptions?.length === 0 && (
          <div className="px-8 py-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Subscriptions Found</h3>
            <p className="text-gray-500">This user has not purchased any subscriptions yet.</p>
          </div>
        )}
        
        {/* Footer */}
        <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200/50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            User ID: <span className="font-mono text-gray-800">{user.id}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddToMeeting(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl text-white font-semibold transform hover:scale-[1.02] transition-all duration-300 shadow-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add to Meeting</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 rounded-xl text-gray-800 font-semibold transform hover:scale-[1.02] transition-all duration-300 shadow-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Close</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Add User to Meeting Modal */}
      <AddUserToMeetingModal
        show={showAddToMeeting}
        onClose={() => setShowAddToMeeting(false)}
        user={user}
        onUserAdded={() => {
          // Refresh user data if needed
          if (onUserUpdated) {
            onUserUpdated(user);
          }
        }}
        onNavigateToCalendar={() => {
          setShowAddToMeeting(false);
          onClose();
          if (onNavigateToCalendar) {
            onNavigateToCalendar();
          }
        }}
      />
    </div>
  );
};

export default UserDetailModal;
