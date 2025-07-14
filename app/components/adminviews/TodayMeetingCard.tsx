import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Helper function to display UTC time stored in DB as IST
const displayUTCAsIST = (utcTimeString: string): Date => {
  // The UTC time stored in DB represents IST time, so we just need to create a Date object
  // and let the browser handle the timezone display
  return new Date(utcTimeString);
};

// Helper function to check if a date is today
const isToday = (dateString: string): boolean => {
  if (!dateString) return false;
  const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const today = istDate.toISOString().split('T')[0];
  return dateString === today;
};

// Helper function to format date with "Today" if it's today
const formatMeetingDate = (dateString: string): string => {
  if (isToday(dateString)) {
    return 'Today';
  }
  return format(new Date(dateString), 'MMM d, yyyy');
};

type TodayMeeting = {
  id: string;
  meetingDate: string;
  platform: string;
  meetingLink: string;
  startTime: string;
  endTime: string;
  startTimeUTC: string;
  endTimeUTC: string;
  meetingTitle: string;
  meetingDesc: string;
  googleEventId?: string;
  zoomMeetingId?: string;
  zoomStartUrl?: string;
  attendeeCount?: number;
};

type Attendee = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  registeredDate: string;
};

interface TodayMeetingCardProps {
  refreshTrigger?: number;
  onAddUserClick?: () => void; // New prop for opening user selection
}

const TodayMeetingCard: React.FC<TodayMeetingCardProps> = ({ refreshTrigger, onAddUserClick }) => {
  const [meeting, setMeeting] = useState<TodayMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAttendees, setShowAttendees] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  useEffect(() => {
    fetchTodayMeeting();
  }, [refreshTrigger]);

  const fetchTodayMeeting = async () => {
    try {
      setLoading(true);
      // Get admin token from session storage
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        setLoading(false);
        return;
      }

      // Get today's date in IST
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const todayStr = format(today, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/admin/today-active/meeting?date=${todayStr}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch today&apos;s meeting');
      }
      
      const data = await response.json();
      if (data.meeting) {
        setMeeting(data.meeting);
      } else {
        setMeeting(null);
      }
    } catch (error) {
      console.error('Error fetching today\'s meeting:', error);
      setError('Failed to fetch today&apos;s meeting');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async () => {
    if (!meeting) return;
    
    try {
      setLoadingAttendees(true);
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      
      const response = await fetch(`/api/admin/meeting-attendees?meetingId=${meeting.id}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendees');
      }
      
      const data = await response.json();
      setAttendees(data.attendees || []);
      setShowAttendees(true);
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setError('Failed to fetch attendees');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleJoinMeeting = () => {
    if (!meeting) return;
    
    // For Zoom, use zoomStartUrl for admin (host) if available
    if (meeting.platform === 'zoom' && meeting.zoomStartUrl) {
      window.open(meeting.zoomStartUrl, '_blank');
    } else {
      // For Google Meet or if no special admin link is available
      window.open(meeting.meetingLink, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 h-48 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-200 border-t-indigo-600"></div>
          <div className="text-gray-600 font-medium">Loading today's meeting...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
          <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-red-800">Error</h4>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Today's Meeting</h3>
        </div>
        
        <div className="text-center py-8">
          <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full inline-block mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-gray-500 mb-4">No meeting scheduled for today</div>
          <button 
            onClick={fetchTodayMeeting}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Today's Meeting</h3>
        </div>
        <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 text-sm font-bold rounded-full border border-emerald-200 capitalize">
          {meeting.platform}
        </span>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200/50">
          <h4 className="text-lg font-bold text-indigo-800 mb-2">{meeting.meetingTitle}</h4>
          {meeting.meetingDesc && (
            <p className="text-indigo-600 text-sm">{meeting.meetingDesc}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-sm text-blue-600 font-medium">Time:</span>
              <span className="ml-2 font-bold text-blue-800">
                {meeting.startTimeUTC ? format(displayUTCAsIST(meeting.startTimeUTC), 'h:mm a') : 'N/A'} - 
                {meeting.endTimeUTC ? format(displayUTCAsIST(meeting.endTimeUTC), 'h:mm a') : 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200/50">
            <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <span className="text-sm text-purple-600 font-medium">Attendees:</span>
              <span className="ml-2 font-bold text-purple-800">
                {meeting.attendeeCount || 0} registered
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Attendee List Modal */}
      {showAttendees && (
        <div className="mt-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200/50">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-gray-800">Meeting Attendees</h5>
            <button 
              onClick={() => setShowAttendees(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {loadingAttendees ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
            </div>
          ) : attendees.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <div className="font-medium text-gray-800">{attendee.name}</div>
                    <div className="text-sm text-gray-600">{attendee.email}</div>
                    {attendee.phone && (
                      <div className="text-sm text-gray-500">{attendee.phone}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Registered: {attendee.registeredDate}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">No attendees registered yet</div>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center space-x-3">
        <button 
          onClick={handleJoinMeeting}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Join as Host</span>
        </button>
        
        {onAddUserClick && (
          <button 
            onClick={onAddUserClick}
            className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            title="Add user to today's meeting"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        )}
        
        <button 
          onClick={fetchAttendees}
          disabled={loadingAttendees}
          className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50"
        >
          {loadingAttendees ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )}
        </button>
        
        <button 
          onClick={fetchTodayMeeting}
          className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Add User Button */}
      <div className="mt-4">
        <button 
          onClick={onAddUserClick}
          className="w-full px-4 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-medium rounded-xl hover:from-green-500 hover:to-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User to Meeting
        </button>
      </div>
    </div>
  );
};

export default TodayMeetingCard;
