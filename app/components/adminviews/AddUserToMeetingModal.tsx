import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

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
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check for meeting when date changes
  useEffect(() => {
    if (show && selectedDate) {
      checkMeetingAvailability();
    }
  }, [selectedDate, show]);

  const checkMeetingAvailability = async () => {
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
          action: 'checkMeeting',
          date: selectedDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check meeting availability');
      }

      const data = await response.json();
      setMeeting(data.meetingExists ? data.meeting : null);
    } catch (error) {
      console.error('Error checking meeting:', error);
      showToast('Failed to check meeting availability', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addUserToMeeting = async () => {
    if (!user || !meeting) return;

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
          action: 'addUserToMeeting',
          userId: user.id,
          meetingId: meeting.id,
          sendInvite: sendInvite
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user to meeting');
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
      console.error('Error adding user to meeting:', error);
      showToast(error instanceof Error ? error.message : 'Failed to add user to meeting', 'error');
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
            <h2 className="text-xl font-bold text-gray-800">Add User to Meeting</h2>
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

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Select Meeting Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Meeting Status */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : meeting ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-bold text-green-800">Meeting Available</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium text-green-700">Title:</span> {meeting.meetingTitle}</div>
                <div><span className="font-medium text-green-700">Platform:</span> {meeting.platform}</div>
                <div><span className="font-medium text-green-700">Time:</span> {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}</div>
                <div><span className="font-medium text-green-700">Date:</span> {format(new Date(meeting.meetingDate), 'MMM d, yyyy')}</div>
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
          ) : selectedDate ? (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-bold text-amber-800">No Meeting Scheduled</h3>
              </div>
              <p className="text-amber-700 text-sm mb-4">
                No meeting is scheduled for {format(new Date(selectedDate), 'MMM d, yyyy')}. 
                You can create a new meeting for this date.
              </p>
            </div>
          ) : null}
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
            
            {meeting ? (
              <button
                onClick={addUserToMeeting}
                disabled={loading || !user}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add to Meeting'}
              </button>
            ) : selectedDate ? (
              <button
                onClick={handleCreateMeeting}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
              >
                Create Meeting
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserToMeetingModal;
