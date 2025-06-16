import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

type TodayMeeting = {
  id: string;
  meetingDate: string;
  platform: string;
  meetingLink: string;
  startTime: string;
  endTime: string;
  startTimeIST: string;
  endTimeIST: string;
  meetingTitle: string;
  meetingDesc: string;
  googleEventId?: string;
  zoomMeetingId?: string;
  zoomStartUrl?: string;
};

interface TodayMeetingCardProps {
  refreshTrigger?: number;
}

const TodayMeetingCard: React.FC<TodayMeetingCardProps> = ({ refreshTrigger }) => {
  const [meeting, setMeeting] = useState<TodayMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      // Get today's date in IST      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
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
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 h-48 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading today&apos;s meeting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">Today&apos;s Meeting</h3>
        <div className="text-gray-500">No meeting scheduled for today</div>
        <div className="mt-2">
          <button 
            onClick={fetchTodayMeeting}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold mb-2">Today&apos;s Meeting</h3>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
        <div className="text-gray-600">Platform:</div>
        <div className="font-medium capitalize">{meeting.platform}</div>
        
        <div className="text-gray-600">Time:</div>
        <div className="font-medium">
          {meeting.startTimeIST ? format(new Date(meeting.startTimeIST), 'h:mm a') : 'N/A'} - 
          {meeting.endTimeIST ? format(new Date(meeting.endTimeIST), 'h:mm a') : 'N/A'}
        </div>
        
        <div className="text-gray-600">Title:</div>
        <div className="font-medium">{meeting.meetingTitle}</div>
      </div>
      
      <div className="mt-4 flex justify-between">
        <button 
          onClick={handleJoinMeeting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Join as Host
        </button>
        
        <button 
          onClick={fetchTodayMeeting}
          className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 ml-2"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default TodayMeetingCard;
