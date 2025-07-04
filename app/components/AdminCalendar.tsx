import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns';
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
        meetingDesc
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
        // Format dates for API
        const dates = selectedDates.map(date => format(date, 'yyyy-MM-dd'));
        Object.assign(requestBody, { dates });
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
  const handleDateClick = (day: Date) => {
    // Make sure we're working with normalized dates (no time component)
    const formattedDay = new Date(format(day, 'yyyy-MM-dd'));
    console.log('Clicked on date:', format(formattedDay, 'yyyy-MM-dd'));
    
    // Check if date is already selected
    const isSelected = selectedDates.some(date => 
      isSameDay(date, formattedDay)
    );
    
    if (isSelected) {
      // Remove date if already selected
      console.log('Removing date from selection');
      setSelectedDates(prev => 
        prev.filter(date => !isSameDay(date, formattedDay))
      );
    } else {
      // Add date if not selected
      console.log('Adding date to selection');
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
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        days.push(
          <div
            key={day.toString()}
            className={`relative h-24 border p-1 
              ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : 'text-gray-700 cursor-pointer hover:bg-gray-100'} 
              ${isSelected ? 'bg-blue-100 border-blue-300' : ''}
            `}
            onClick={() => isCurrentMonth && handleDateClick(cloneDay)}
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
                    title={`${meeting.meetingTitle} - ${format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')} (${meeting.platform})`}
                  >
                    {format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')}
                  </div>
                ))}
              </div>
            )}
            
            {isSelected && (
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">      {/* Calendar */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow p-4">
          {renderHeader()}
          {renderDays()}
          
          {/* Calendar Instructions */}
          {!isDateRange && (
            <div className="mb-2 p-2 bg-blue-50 rounded-md text-sm text-blue-700">
              Click on dates to select them for meeting creation. Selected dates appear with blue background.
            </div>
          )}
          
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
                Selection Mode
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="dateSelectionMode"
                    checked={!isDateRange}
                    onChange={() => setIsDateRange(false)}
                  />
                  <span className="ml-2">Individual Dates</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="dateSelectionMode"
                    checked={isDateRange}
                    onChange={() => setIsDateRange(true)}
                  />
                  <span className="ml-2">Date Range</span>
                </label>
              </div>
            </div>
              {isDateRange && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                {/* Quick date range selection */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button 
                    type="button"
                    className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
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
                    Next 7 days
                  </button>
                  <button 
                    type="button"
                    className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
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
                    Next 30 days
                  </button>
                </div>
              </div>
            )}
            
            {!isDateRange && selectedDates.length > 0 && (
              <div className="p-3 bg-blue-50 rounded text-sm">
                Selected {selectedDates.length} date(s). Click on dates in the calendar to select/deselect.
              </div>
            )}
            
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
              className={`w-full py-3 rounded transition flex items-center justify-center ${
                loading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : (!isDateRange && selectedDates.length === 0) 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Create {isDateRange 
                    ? 'Meetings for Date Range' 
                    : `${selectedDates.length} Meeting${selectedDates.length !== 1 ? 's' : ''}`}
                </>
              )}
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
