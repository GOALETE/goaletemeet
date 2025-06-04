import React from 'react';
import { format } from 'date-fns';

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
}) => {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

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
  const activeSubs = user.subscriptions?.filter(sub => sub.status === 'active').length || 0;  // Function to grant superuser status
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* --- User Info Section --- */}
        <div className="px-6 py-4 border-b">
          <div className="mb-2 text-lg font-semibold text-gray-700">User Information</div>
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
        <div className="px-6 py-3 bg-gray-50 border-b flex justify-between items-center">
          <div>
            {user.role !== 'superuser' && (
              <button 
                onClick={handleGrantSuperuser}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Grant Superuser Status'}
              </button>
            )}
          </div>
          <div>
            {successMessage && (
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="px-4 py-2 bg-red-100 text-red-800 rounded">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
        
        {/* Subscription Filters */}
        {user.subscriptions?.length > 0 && (
          <>
            <div className="px-6 py-3 bg-gray-50 border-b">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="text-sm text-gray-600 mr-2">Status:</label>
                  <select 
                    value={modalFilterStatus}
                    onChange={(e) => setModalFilterStatus(e.target.value)}
                    className="p-1 border rounded text-sm"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mr-2">Payment:</label>
                  <select 
                    value={modalFilterPayment}
                    onChange={(e) => setModalFilterPayment(e.target.value)}
                    className="p-1 border rounded text-sm"
                  >
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Subscriptions Table */}
            <div className="px-6 py-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleModalSort('planType')}
                    >
                      Plan Type
                      {modalSortBy === 'planType' && (
                        <span className="ml-1">{modalSortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleModalSort('startDate')}
                    >
                      Start Date
                      {modalSortBy === 'startDate' && (
                        <span className="ml-1">{modalSortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleModalSort('endDate')}
                    >
                      End Date
                      {modalSortBy === 'endDate' && (
                        <span className="ml-1">{modalSortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleModalSort('status')}
                    >
                      Status
                      {modalSortBy === 'status' && (
                        <span className="ml-1">{modalSortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleModalSort('paymentStatus')}
                    >
                      Payment
                      {modalSortBy === 'paymentStatus' && (
                        <span className="ml-1">{modalSortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleModalSort('price')}
                    >
                      Price
                      {modalSortBy === 'price' && (
                        <span className="ml-1">{modalSortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Order ID
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
                    .map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {sub.planType}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sub.startDate)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sub.endDate)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${sub.status === 'active' ? 'bg-green-100 text-green-800' : 
                              sub.status === 'expired' ? 'bg-gray-100 text-gray-800' : 
                              sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${sub.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                              sub.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {sub.paymentStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          ₹{sub.price || 0}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
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
                <div className="py-4 text-center text-gray-500">
                  No subscriptions match the current filters
                </div>
              )}
            </div>
          </>
        )}
        
        {user.subscriptions?.length === 0 && (
          <div className="px-6 py-4 text-center text-gray-500">
            This user has no subscriptions
          </div>
        )}
        
        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
