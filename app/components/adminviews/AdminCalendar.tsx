import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form state
  const [platform, setPlatform] = useState('google-meet');
  const [startTime, setStartTime] = useState('21:00');
  const [duration, setDuration] = useState(60);
  const [meetingTitle, setMeetingTitle] = useState('GOALETE Club Session');
  const [meetingDesc, setMeetingDesc] = useState('Join us for a GOALETE Club session to learn how to achieve any goal in life.');
  const [isDateRange, setIsDateRange] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd')
  });

  // Calendar navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const fetchMeetings = useCallback(async () => {
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
  }, [currentMonth]);
  useEffect(() => {
    fetchMeetings();
  }, [currentMonth, fetchMeetings]);

  const createMeetings = async () => {
    try {
      if (!isDateRange && selectedDates.length === 0) {
        showToast('Please select at least one date or use date range', 'error');
        return;
      }

      if (isDateRange && (!dateRange.startDate || !dateRange.endDate)) {
        showToast('Please provide both start and end dates for the range', 'error');
        return;
      }
      
      setLoading(true);
      setError('');
      
      // Get admin token from session storage
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing - please log in again');
        setLoading(false);
        return;
      }
      
      // Prepare request payload based on selection mode
      const requestBody = {
        platform,
        startTime,
        duration: Number(duration),
        meetingTitle,
        meetingDesc,
        addActiveUsers: false // Always false now - users added by cron job
      };

      // Add either dates array or date range
      if (isDateRange) {
        Object.assign(requestBody, {
          dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        });
      } else {
        Object.assign(requestBody, { dates: selectedDates });
      }
      
      console.log("Creating meetings with:", requestBody);
      showToast('Creating meetings...', 'success');
      
      const response = await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPasscode}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create meetings');
      }
      
      showToast(`Successfully created ${data.meetings.length} meetings`, 'success');
      
      // Clear selected dates after successful creation
      if (!isDateRange) {
        setSelectedDates([]);
      }
      
      // Refresh the calendar to show the new meetings
      fetchMeetings();
    } catch (error) {
      console.error('Error creating meetings:', error);
      showToast('Failed to create meetings: ' + (error instanceof Error ? error.message : String(error)), 'error');
      setError('Failed to create meetings: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const handleDateClick = (dateString: string) => {
    console.log('Clicked on date:', dateString);
    
    // Check if the date is in the past
    const clickedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    if (clickedDate < today) {
      showToast('Cannot select past dates', 'error');
      return;
    }
    
    if (selectedDates.includes(dateString)) {
      // Remove date if already selected
      console.log('Removing date from selection');
      setSelectedDates(prev => prev.filter(date => date !== dateString));
    } else {
      // Add date if not selected
      console.log('Adding date to selection');
      setSelectedDates(prev => [...prev, dateString]);
    }
  };

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = [];
    let currentDate = new Date(startDate);
    
    // Create meetings lookup
    const meetingsByDate = meetings.reduce((acc, meeting) => {
      const dateKey = format(new Date(meeting.meetingDate), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(meeting);
      return acc;
    }, {} as Record<string, Meeting[]>);
    
    while (currentDate <= endDate) {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const dayNumber = format(currentDate, 'd');
      const isCurrentMonth = isSameMonth(currentDate, monthStart);
      const isSelected = selectedDates.includes(dateString);
      const dayMeetings = meetingsByDate[dateString] || [];
      const hasMeetings = dayMeetings.length > 0;
      
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPastDate = new Date(dateString) < today;
      
      days.push(
        <div
          key={dateString}
          className={`relative h-16 sm:h-20 p-1 sm:p-2 select-none transition-all duration-200 ease-out group ${
            !isCurrentMonth 
              ? 'text-gray-300 bg-gray-50/50 hover:bg-gray-100/50' 
              : isPastDate
                ? 'text-gray-400 bg-gray-100/70 cursor-not-allowed opacity-60'
                : 'text-gray-800 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:scale-[1.02] hover:shadow-md cursor-pointer'
          } ${isSelected ? 'bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-indigo-300 shadow-md scale-[1.02]' : 'border border-gray-200/50'} rounded-xl`}
          onClick={() => {
            if (isCurrentMonth && !isPastDate) {
              handleDateClick(dateString);
            }
          }}
        >
          <div className="flex justify-between items-start h-full">
            <div className="flex flex-col justify-between h-full w-full">
              <div className="flex justify-between items-start">
                <span className={`text-xs sm:text-sm font-semibold px-1 sm:px-2 py-1 rounded-lg transition-all duration-200 ${
                  hasMeetings 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg transform scale-110' 
                    : isSelected 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                      : isPastDate
                        ? 'text-gray-500'
                        : 'text-gray-700 group-hover:text-indigo-600'
                }`}>
                  {dayNumber}
                </span>
                {hasMeetings && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-1 sm:px-2 py-1 rounded-full font-medium">
                    {dayMeetings.length}
                  </span>
                )}
                {isPastDate && (
                  <span className="text-xs text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
              </div>
              
              {hasMeetings && (
                <div className="mt-1 space-y-1 hidden sm:block">
                  {dayMeetings.slice(0, 2).map((meeting) => (
                    <div 
                      key={meeting.id}
                      className={`px-2 py-1 rounded-lg text-xs font-medium truncate shadow-sm transition-all duration-200 hover:shadow-md ${
                        meeting.platform === 'google-meet' 
                          ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300/50' 
                          : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-300/50'
                      }`}
                      title={`${meeting.meetingTitle} - ${format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')} (${meeting.platform})`}
                    >
                      {format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')}
                    </div>
                  ))}
                  {dayMeetings.length > 2 && (
                    <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-lg">
                      +{dayMeetings.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg border-2 border-white"></div>
          )}
        </div>
      );
      
      currentDate = addDays(currentDate, 1);
    }      return (
        <div className="grid grid-cols-7 gap-1 p-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200/50 shadow-inner">
          {days}
        </div>
      );
  };

  const renderSelectedDates = () => {
    if (selectedDates.length === 0) return null;
    
    return (
      <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200/50 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-800">Selected Dates ({selectedDates.length})</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedDates.map(dateString => (
            <span 
              key={dateString}
              className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-300/50 rounded-xl text-indigo-800 text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all duration-200"
            >
              {format(new Date(dateString), 'MMM d, yyyy')}
              <button 
                className="ml-3 p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-200 rounded-full transition-all duration-200"
                onClick={() => setSelectedDates(prev => prev.filter(d => d !== dateString))}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <button 
          className="mt-4 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition-all duration-200 font-medium"
          onClick={() => setSelectedDates([])}
        >
          Clear all selections
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-3 sm:p-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-sm border ${
          toast.type === 'success' 
            ? 'bg-emerald-500/90 border-emerald-400 text-white' 
            : 'bg-red-500/90 border-red-400 text-white'
        } transform transition-all duration-300 ease-out`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Meeting Calendar
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Schedule and manage your meetings with style</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
        {/* Calendar */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-3 sm:p-6">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Select dates to create meetings</p>
              </div>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2 sm:mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-sm tracking-wide">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
            </div>
            
            {/* Calendar Instructions */}
            {!isDateRange && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-800 font-medium">
                    Click on future dates to select them for meeting creation. Past dates are blocked and cannot be selected.
                  </span>
                </div>
              </div>
            )}
            
            {/* Calendar Grid */}
            {renderCalendarGrid()}
            
            {/* Selected Dates */}
            {renderSelectedDates()}
          </div>
        </div>

        {/* Meeting creation form */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:sticky lg:top-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Create Meetings
              </h3>
            </div>
            
            <div className="space-y-4 sm:space-y-6">            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Platform
              </label>
              <div className="relative">
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 appearance-none bg-white"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="google-meet">🎥 Google Meet</option>
                  <option value="zoom" disabled className="text-gray-400">📹 Zoom (Coming Soon)</option>
                  <option value="teams" disabled className="text-gray-400">📺 Microsoft Teams (Coming Soon)</option>
                  <option value="webex" disabled className="text-gray-400">🎯 Cisco Webex (Coming Soon)</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Currently only Google Meet is available. Other platforms coming soon.
              </p>
            </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200/50">
                <h4 className="font-bold text-indigo-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm sm:text-base">Optimized Meeting Creation</span>
                </h4>
                <ul className="text-indigo-700 text-xs sm:text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">•</span>
                    <span><strong>Create Meetings:</strong> Admin creates meetings in advance with meeting links stored in database</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">•</span>
                    <span><strong>Daily Cron (10 AM):</strong> Automatically adds active users to meetings and sends invites</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">•</span>
                    <span><strong>Immediate Invites:</strong> Users registering after cron but before meeting get instant invites</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">•</span>
                    <span><strong>Default Fallback:</strong> If no admin meeting exists, system creates one with default settings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">•</span>
                    <span><strong>Efficient Process:</strong> Meeting creation is separate from user management for better performance</span>
                  </li>
                </ul>
              </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Selection Mode
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    className="sr-only"
                    name="dateSelectionMode"
                    checked={!isDateRange}
                    onChange={() => setIsDateRange(false)}
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center transition-all duration-200 ${
                    !isDateRange ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                  }`}>
                    {!isDateRange && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <span className="text-gray-700 font-medium">Individual Dates</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    className="sr-only"
                    name="dateSelectionMode"
                    checked={isDateRange}
                    onChange={() => setIsDateRange(true)}
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center transition-all duration-200 ${
                    isDateRange ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                  }`}>
                    {isDateRange && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <span className="text-gray-700 font-medium">Date Range</span>
                </label>
              </div>
            </div>

            {isDateRange && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                      value={dateRange.startDate}
                      min={format(new Date(), 'yyyy-MM-dd')} // Prevent past dates
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                      value={dateRange.endDate}
                      min={dateRange.startDate || format(new Date(), 'yyyy-MM-dd')} // Prevent past dates and dates before start date
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>
                </div>
                
                {/* Quick date range selection */}
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button"
                    className="px-4 py-2 text-sm bg-white/70 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all duration-200 font-medium text-purple-700"
                    onClick={() => {
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 6);
                      setDateRange({
                        startDate: format(today, 'yyyy-MM-dd'),
                        endDate: format(nextWeek, 'yyyy-MM-dd')
                      });
                    }}
                  >
                    📅 Next 7 days
                  </button>
                  <button 
                    type="button"
                    className="px-4 py-2 text-sm bg-white/70 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all duration-200 font-medium text-purple-700"
                    onClick={() => {
                      const today = new Date();
                      const nextMonth = new Date(today);
                      nextMonth.setMonth(today.getMonth() + 1);
                      setDateRange({
                        startDate: format(today, 'yyyy-MM-dd'),
                        endDate: format(nextMonth, 'yyyy-MM-dd')
                      });
                    }}
                  >
                    📆 Next 30 days
                  </button>
                </div>
              </div>
            )}
            
            {!isDateRange && selectedDates.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-emerald-800 font-medium">
                    Selected {selectedDates.length} date(s). Click on dates in the calendar to select/deselect.
                  </span>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time (IST)
              </label>
              <div className="relative">
                <input
                  type="time"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time is in Indian Standard Time (IST)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="15"
                max="240"
                placeholder="60"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meeting Title
              </label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="GOALETE Club Session"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meeting Description
              </label>
              <textarea
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 resize-none"
                value={meetingDesc}
                onChange={(e) => setMeetingDesc(e.target.value)}
                rows={3}
                placeholder="Join us for a GOALETE Club session to learn how to achieve any goal in life."
              />
            </div>

            <button
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : (!isDateRange && selectedDates.length === 0) 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25'
              }`}
              onClick={createMeetings}
              disabled={loading || (!isDateRange && selectedDates.length === 0)}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>
                    Create {isDateRange 
                      ? 'Meetings for Date Range' 
                      : `${selectedDates.length} Meeting${selectedDates.length !== 1 ? 's' : ''}`}
                  </span>
                </>
              )}
            </button>
            
            {error && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800 font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
