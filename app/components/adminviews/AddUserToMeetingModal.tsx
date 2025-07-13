import React, { useState, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';

type Meeting = {
  id: string;
  meetingDate: string;
  platform: string;
  meetingTitle: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
};

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone: string;
};

interface AddUserToMeetingModalProps {
  show: boolean;
  onClose: () => void;
  user?: User;
  onUserAdded?: () => void;
  onNavigateToCalendar?: () => void;
}

const AddUserToMeetingModal: React.FC<AddUserToMeetingModalProps> = ({
  show,
  onClose,
  user,
  onUserAdded,
  onNavigateToCalendar
}) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [planType, setPlanType] = useState<'single-day' | 'monthly' | 'family-monthly' | 'unlimited'>('single-day');
  const [loading, setLoading] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Cleanup useEffect for the old check meeting code
  useEffect(() => {
    if (show) {
      // Set default end date to same as start date for single-day plan
      setEndDate(selectedDate);
      setPlanType('single-day');
    }
  }, [selectedDate, show]);

  // Handle date selection changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    if (!newStartDate) return;
    
    setSelectedDate(newStartDate);
    
    try {
      const startDateObj = new Date(newStartDate);
      if (isNaN(startDateObj.getTime())) {
        console.warn('Invalid start date:', newStartDate);
        return;
      }
      
      // If single-day plan, end date equals start date
      // If monthly plan was already selected, calculate new end date
      if (planType === 'single-day') {
        setEndDate(newStartDate);
      } else if (planType === 'monthly' || planType === 'family-monthly') {
        // Set end date to one month from start date
        const newEndDate = format(addDays(startDateObj, 30), 'yyyy-MM-dd');
        setEndDate(newEndDate);
      } else if (planType === 'unlimited') {
        // Set end date to one year from start date for unlimited
        const newEndDate = format(addDays(startDateObj, 365), 'yyyy-MM-dd');
        setEndDate(newEndDate);
      }
    } catch (error) {
      console.error('Error calculating dates:', error);
    }
  };

  // Handle plan type changes
  const handlePlanTypeChange = (newPlanType: 'single-day' | 'monthly' | 'family-monthly' | 'unlimited') => {
    setPlanType(newPlanType);
    
    if (!selectedDate) return;
    
    try {
      const startDateObj = new Date(selectedDate);
      if (isNaN(startDateObj.getTime())) {
        console.warn('Invalid selected date:', selectedDate);
        return;
      }
      
      if (newPlanType === 'single-day') {
        // For single-day, end date is same as start date
        setEndDate(selectedDate);
      } else if (newPlanType === 'monthly' || newPlanType === 'family-monthly') {
        // For monthly plans, end date is 30 days after start date
        const newEndDate = format(addDays(startDateObj, 30), 'yyyy-MM-dd');
        setEndDate(newEndDate);
      } else if (newPlanType === 'unlimited') {
        // For unlimited, end date is 1 year after start date
        const newEndDate = format(addDays(startDateObj, 365), 'yyyy-MM-dd');
        setEndDate(newEndDate);
      }
    } catch (error) {
      console.error('Error calculating plan dates:', error);
    }
  };

  // Handle end date changes (only for custom ranges)
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (!newEndDate) return;
    
    setEndDate(newEndDate);
    
    // Calculate plan type based on date range
    try {
      const startDateObj = new Date(selectedDate);
      const endDateObj = new Date(newEndDate);
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        console.warn('Invalid date values:', selectedDate, newEndDate);
        return;
      }
      
      const days = differenceInDays(endDateObj, startDateObj);
      if (days <= 1) {
        setPlanType('single-day');
      } else if (days <= 30) {
        setPlanType('monthly');
      } else {
        setPlanType('unlimited');
      }
    } catch (error) {
      console.error('Error calculating date difference:', error);
    }
  };

  const addUserToSubscription = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      
      const response = await fetch('/api/admin/add-user-to-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPasscode}`
        },
        body: JSON.stringify({
          action: 'createSubscription',
          userId: user.id,
          startDate: selectedDate,
          endDate: endDate,
          planType: planType,
          sendInvite: sendInvite
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add subscription');
      }

      const data = await response.json();
      showToast(data.message, 'success');
      
      // Call callback to refresh data
      if (onUserAdded) {
        onUserAdded();
      }
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error adding subscription:', error);
      showToast(error instanceof Error ? error.message : 'Failed to add subscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = () => {
    // Navigate to calendar view for meeting creation
    if (onNavigateToCalendar) {
      onNavigateToCalendar();
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-60 px-6 py-3 rounded-xl shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Add User Subscription</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          {user && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">Selected User</h3>
              <div className="space-y-1">
                <div className="text-blue-700 font-medium">
                  {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0]}
                </div>
                <div className="text-blue-600 text-sm">{user.email}</div>
                <div className="text-blue-600 text-sm">{user.phone}</div>
              </div>
            </div>
          )}

          {/* Plan Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Select Plan Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePlanTypeChange('single-day')}
                className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  planType === 'single-day' 
                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Single Day
              </button>
              <button
                onClick={() => handlePlanTypeChange('monthly')}
                className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  planType === 'monthly' 
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => handlePlanTypeChange('family-monthly')}
                className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  planType === 'family-monthly' 
                    ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Family Monthly
              </button>
              <button
                onClick={() => handlePlanTypeChange('unlimited')}
                className={`px-4 py-2 rounded-xl font-medium text-sm ${
                  planType === 'unlimited' 
                    ? 'bg-amber-100 text-amber-800 border-2 border-amber-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Unlimited
              </button>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* End Date Selection (visible for monthly plan) */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              min={selectedDate}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500">
              {planType === 'single-day' ? 'Single day plan is for a single day' : 
               planType === 'monthly' ? 'Monthly plan provides access for 30 days' :
               planType === 'family-monthly' ? 'Family monthly plan provides access for 30 days for family' :
               'Unlimited plan provides lifetime access'}
            </p>
          </div>

          {/* Plan Summary */}
          {!loading && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-bold text-green-800">Subscription Summary</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium text-green-700">Plan Type:</span> {
                  planType === 'single-day' ? 'Single Day' : 
                  planType === 'monthly' ? 'Monthly' :
                  planType === 'family-monthly' ? 'Family Monthly' :
                  'Unlimited'
                }</div>
                <div><span className="font-medium text-green-700">Start Date:</span> {selectedDate ? format(new Date(selectedDate), 'MMM d, yyyy') : 'Not set'}</div>
                <div><span className="font-medium text-green-700">End Date:</span> {endDate ? format(new Date(endDate), 'MMM d, yyyy') : 'Not set'}</div>
                <div><span className="font-medium text-green-700">Duration:</span> {
                  selectedDate && endDate ? 
                    `${differenceInDays(new Date(endDate), new Date(selectedDate)) + 1} day(s)` : 
                    'Not calculated'
                }</div>
              </div>
              
              {/* Send Invite Option */}
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="sendInvite"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="sendInvite" className="text-sm text-green-700">
                  Send meeting invitation email
                </label>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-200 border-t-indigo-600"></div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={addUserToSubscription}
              disabled={loading || !user}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Add Subscription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserToMeetingModal;
