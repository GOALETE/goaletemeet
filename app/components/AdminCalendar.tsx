import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

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

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form state
  const [platform, setPlatform] = useState('google-meet');
  const [startTime, setStartTime] = useState('20:00');
  const [duration, setDuration] = useState(60);
  const [meetingTitle, setMeetingTitle] = useState('GOALETE Club Session');
  const [meetingDesc, setMeetingDesc] = useState('Join us for a GOALETE Club session to learn how to achieve any goal in life.');

  // Calendar navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  useEffect(() => {
    fetchMeetings();
  }, [currentMonth]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      
      // Get date range for current month view
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      // Get admin token from session storage
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/meetings?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      
      const data = await response.json();
      setMeetings(data.meetings);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError('Failed to fetch meetings');
      setLoading(false);
    }
  };

  const createMeetings = async () => {
    try {
      if (selectedDates.length === 0) {
        showToast('Please select at least one date', 'error');
        return;
      }
      
      setLoading(true);
      
      // Format dates for API
      const dates = selectedDates.map(date => format(date, 'yyyy-MM-dd'));
      
      // Get admin token from session storage
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPasscode}`
        },
        body: JSON.stringify({
          dates,
          platform,
          startTime,
          duration: Number(duration),
          meetingTitle,
          meetingDesc
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create meetings');
      }
      
      const data = await response.json();
      showToast(`Successfully created ${data.meetings.length} meetings`, 'success');
      setSelectedDates([]);
      fetchMeetings();
      setLoading(false);
    } catch (error) {
      console.error('Error creating meetings:', error);
      showToast('Failed to create meetings', 'error');
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDateClick = (day: Date) => {
    const formattedDay = new Date(format(day, 'yyyy-MM-dd'));
    
    // Check if date is already selected
    const isSelected = selectedDates.some(date => 
      isSameDay(date, formattedDay)
    );
    
    if (isSelected) {
      // Remove date if already selected
      setSelectedDates(prev => 
        prev.filter(date => !isSameDay(date, formattedDay))
      );
    } else {
      // Add date if not selected
      setSelectedDates(prev => [...prev, formattedDay]);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={prevMonth}
          className="p-2 rounded hover:bg-gray-100"
        >
          &lt;
        </button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button 
          onClick={nextMonth}
          className="p-2 rounded hover:bg-gray-100"
        >
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="py-2 text-center font-semibold">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const dateFormat = 'd';
    const rows = [];
    
    let days = [];
    let day = startDate;
    let formattedDate = '';
    
    // Map meetings to dates
    const meetingDates = meetings.reduce((acc, meeting) => {
      const date = format(new Date(meeting.meetingDate), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(meeting);
      return acc;
    }, {} as Record<string, Meeting[]>);
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dateStr = format(day, 'yyyy-MM-dd');
        const hasMeeting = meetingDates[dateStr]?.length > 0;
        const isSelected = selectedDates.some(date => isSameDay(date, day));
        
        days.push(
          <div
            key={day.toString()}
            className={`relative h-24 border p-1 ${
              !isSameMonth(day, monthStart)
                ? 'text-gray-300'
                : 'text-gray-700'
            } ${
              isSelected ? 'bg-blue-100' : ''
            }`}
            onClick={() => isSameMonth(day, monthStart) && handleDateClick(cloneDay)}
          >
            <div className="flex justify-between items-start">
              <span className={`text-sm p-1 ${hasMeeting ? 'bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                {formattedDate}
              </span>
              {hasMeeting && (
                <span className="text-xs text-green-600 font-semibold">
                  {meetingDates[dateStr].length} meeting{meetingDates[dateStr].length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {hasMeeting && (
              <div className="mt-1 text-xs">
                {meetingDates[dateStr].map((meeting, idx) => (
                  <div 
                    key={meeting.id} 
                    className={`mb-1 p-1 rounded truncate ${meeting.platform === 'google-meet' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}
                    title={`${meeting.meetingTitle} - ${format(new Date(meeting.startTimeIST), 'h:mm a')} (${meeting.platform})`}
                  >
                    {format(new Date(meeting.startTimeIST), 'h:mm a')}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        day = new Date(day.getTime() + 24 * 60 * 60 * 1000); // Add a day
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    
    return <div className="mb-4">{rows}</div>;
  };

  const renderSelectedDates = () => {
    if (selectedDates.length === 0) return null;
    
    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Selected Dates ({selectedDates.length})</h3>
        <div className="flex flex-wrap gap-2">
          {selectedDates.map(date => (
            <span 
              key={date.toString()} 
              className="px-3 py-1 bg-blue-100 rounded-full text-blue-800 text-sm flex items-center"
            >
              {format(date, 'MMM d, yyyy')}
              <button 
                className="ml-2 text-blue-500 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)));
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <button 
          className="mt-2 text-sm text-red-600 hover:text-red-800"
          onClick={() => setSelectedDates([])}
        >
          Clear all
        </button>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}
      
      <h2 className="text-2xl font-bold mb-4">Meeting Calendar</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow p-4">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
          {renderSelectedDates()}
        </div>
        
        {/* Meeting creation form */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <h3 className="text-xl font-semibold mb-4">Create Meetings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="google-meet">Google Meet</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time (IST)
              </label>
              <input
                type="time"
                className="w-full p-2 border border-gray-300 rounded"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Time is in Indian Standard Time (IST)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="15"
                max="240"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Title
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Description
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                value={meetingDesc}
                onChange={(e) => setMeetingDesc(e.target.value)}
                rows={3}
              />
            </div>
            
            <button
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              onClick={createMeetings}
              disabled={loading || selectedDates.length === 0}
            >
              {loading ? 'Creating...' : `Create Meeting${selectedDates.length !== 1 ? 's' : ''}`}
            </button>
            
            {error && (
              <div className="p-2 text-red-600 bg-red-50 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
