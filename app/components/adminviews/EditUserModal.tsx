import React, { useState } from 'react';
import { UserWithSubscriptions } from './UserDetailModal';

interface EditUserModalProps {
  user: UserWithSubscriptions;
  show: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: UserWithSubscriptions) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  show,
  onClose,
  onUserUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || '',
    source: user.source || '',
  });

  if (!show) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        throw new Error('Admin authentication required');
      }

      // Prepare the request body, excluding source if it's admin-created
      const requestBody: any = {
        userId: user.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      };

      // Only include source if it's not admin-created
      if (formData.source !== 'admin-created') {
        requestBody.source = formData.source;
      }

      const response = await fetch(`/api/admin/user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPasscode}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      const data = await response.json();
      setSuccessMessage('User updated successfully');
      
      // Update the user data
      if (data.user) {
        onUserUpdated(data.user);
      } else {
        // Fallback update - preserve original source if it was admin-created
        onUserUpdated({
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          source: formData.source === 'admin-created' ? user.source : formData.source,
        });
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete user "${user.email}"? This action cannot be undone and will also delete all their subscriptions.`)) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    
    try {
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        throw new Error('Admin authentication required');
      }

      const response = await fetch(`/api/admin/user?id=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      setSuccessMessage('User deleted successfully');
      
      // Close modal and refresh the list
      setTimeout(() => {
        onClose();
        // Trigger a refresh of the user list by calling onUserUpdated with null
        // The parent component should handle this to refresh the user list
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Error deleting user:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-2xl border border-white/20">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200/50 px-8 py-6 bg-gradient-to-r from-emerald-50 to-green-50">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Edit User
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

        {/* Form Content */}
        <div className="p-8">
          <div className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                placeholder="Enter email address"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                placeholder="Enter phone number"
              />
            </div>

            {/* Source Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Source</label>
              {formData.source === 'admin-created' ? (
                <div className="relative">
                  <input
                    type="text"
                    value={formData.source}
                    disabled
                    className="w-full p-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                    placeholder="Enter source (e.g., website, referral, etc.)"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This field cannot be edited for admin-created users.
                  </p>
                </div>
              ) : (
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  placeholder="Enter source (e.g., website, referral, etc.)"
                />
              )}
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mt-6 px-4 py-3 bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-300 text-emerald-800 rounded-xl font-medium flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-6 px-4 py-3 bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 text-red-800 rounded-xl font-medium flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between">
            {/* Delete Button */}
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 hover:scale-[1.02] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete User</span>
            </button>

            {/* Save and Cancel Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 hover:scale-[1.02] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
