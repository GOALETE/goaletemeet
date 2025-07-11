'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, isAfter } from 'date-fns';

type Meeting = {
  id: string;
  meetingDate: string;
  platform: string;
  meetingLink: string;
  startTime: string;
  endTime: string;
  startTimeIST: string;
  endTimeIST: string;
  createdAt: string;
  isDefault: boolean;
  meetingDesc: string;
  meetingTitle: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  createdAt: string;
};

export default function UserManagementView() {
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('admin');
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // Data state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Date range state for filtering meetings
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'yyyy-MM-dd')
  });

  // Fetch meetings from API
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      
      // Get admin token from session storage
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/meetings?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
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
      setError('Failed to fetch meetings: ' + (error instanceof Error ? error.message : String(error)));
      setLoading(false);
    }
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      // Get admin token from session storage
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        return;
      }
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${adminPasscode}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchUsers();
  }, []);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle date selection for meetings
  const handleDateSelect = (date: string) => {
    // Check if date is already selected
    if (selectedDates.includes(date)) {
      // Remove date
      setSelectedDates(selectedDates.filter(d => d !== date));
      
      // Remove all meetings on this date from the selected meetings
      const meetingsOnDate = meetings.filter(m => format(new Date(m.meetingDate), 'yyyy-MM-dd') === date);
      const meetingIdsToRemove = meetingsOnDate.map(m => m.id);
      setSelectedMeetingIds(selectedMeetingIds.filter(id => !meetingIdsToRemove.includes(id)));
    } else {
      // Add date
      setSelectedDates([...selectedDates, date]);
      
      // Add all meetings on this date to the selected meetings
      const meetingsOnDate = meetings.filter(m => format(new Date(m.meetingDate), 'yyyy-MM-dd') === date);
      const newMeetingIds = [...selectedMeetingIds];
      meetingsOnDate.forEach(meeting => {
        if (!newMeetingIds.includes(meeting.id)) {
          newMeetingIds.push(meeting.id);
        }
      });
      setSelectedMeetingIds(newMeetingIds);
    }
  };

  // Handle meeting selection
  const handleMeetingSelect = (meetingId: string) => {
    if (selectedMeetingIds.includes(meetingId)) {
      setSelectedMeetingIds(selectedMeetingIds.filter(id => id !== meetingId));
    } else {
      setSelectedMeetingIds([...selectedMeetingIds, meetingId]);
    }
  };

  // Create user and add to meetings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form
      if (!firstName || !lastName || !email || !phone) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      
      if (selectedMeetingIds.length === 0) {
        showToast('Please select at least one meeting', 'error');
        return;
      }
      
      setFormLoading(true);
      
      // Get admin token from session storage
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        setFormLoading(false);
        return;
      }
      
      // First, create the user
      const createUserResponse = await fetch('/api/admin/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPasscode}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          source
        })
      });
      
      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      const userData = await createUserResponse.json();
      
      // Now, add the user to selected meetings
      const addToMeetingsResponse = await fetch('/api/admin/user/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPasscode}`
        },
        body: JSON.stringify({
          userId: userData.user.id,
          meetingIds: selectedMeetingIds
        })
      });
      
      if (!addToMeetingsResponse.ok) {
        const errorData = await addToMeetingsResponse.json();
        throw new Error(errorData.message || 'Failed to add user to meetings');
      }
      
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setSelectedMeetingIds([]);
      setSelectedDates([]);
      
      showToast('User created and added to meetings successfully', 'success');
      
      // Refresh users
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Error: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Filter meetings by date
  const groupedMeetings = meetings.reduce((groups: Record<string, Meeting[]>, meeting) => {
    const date = format(new Date(meeting.meetingDate), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(meeting);
    return groups;
  }, {});

  // Sort dates for display
  const sortedDates = Object.keys(groupedMeetings).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
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
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-gray-600 font-medium mt-1">Create users and assign them to meetings</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Creation Form */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Create New User</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name*
                </label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name*
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email*
              </label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone*
              </label>
              <input
                type="tel"
                className="w-full p-2 border border-gray-300 rounded"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="pt-4">
              <h4 className="font-medium mb-2">Selected Meetings ({selectedMeetingIds.length})</h4>
              {selectedMeetingIds.length === 0 ? (
                <p className="text-sm text-gray-500">No meetings selected. Please select meetings from the list.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto p-2 border border-gray-200 rounded">
                  {selectedMeetingIds.map(id => {
                    const meeting = meetings.find(m => m.id === id);
                    if (!meeting) return null;
                    
                    return (
                      <div key={id} className="flex justify-between items-center py-1 px-2 text-sm border-b last:border-0">
                        <div>
                          <span className="font-medium">{format(new Date(meeting.meetingDate), 'MMM d, yyyy')}</span>
                          <span className="text-gray-500 ml-2">
                            {format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleMeetingSelect(id)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className={`w-full py-2 rounded transition ${
                formLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              disabled={formLoading}
            >
              {formLoading ? 'Creating...' : 'Create User & Add to Meetings'}
            </button>
          </form>
        </div>
        
        {/* Meeting Selection */}
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Select Meetings</h3>
            <div className="grid grid-cols-2 gap-4">
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
            <button
              className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              onClick={fetchMeetings}
            >
              Refresh Meetings
            </button>
          </div>
          
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-red-600 bg-red-50 rounded">
              {error}
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-6 text-center bg-yellow-50 rounded-lg">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No meetings found</h3>
              <p className="text-yellow-600">
                No meetings available in the selected date range. Try adjusting the dates or create new meetings first.
              </p>
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => window.location.href = '/admin?tab=calendar'}
              >
                Go to Calendar
              </button>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {sortedDates.map(date => {
                const isDateSelected = selectedDates.includes(date);
                const today = new Date();
                const meetingDate = parseISO(date);
                const isPastDate = !isAfter(meetingDate, today);
                
                return (
                  <div key={date} className="mb-4">
                    <div 
                      className={`flex justify-between items-center p-2 rounded-t cursor-pointer ${
                        isDateSelected ? 'bg-blue-100' : isPastDate ? 'bg-gray-100' : 'bg-green-50'
                      }`}
                      onClick={() => handleDateSelect(date)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isDateSelected}
                          onChange={() => {}}
                          className="mr-2"
                        />
                        <span className="font-medium">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>
                      <span className="text-sm">
                        {groupedMeetings[date].length} meeting{groupedMeetings[date].length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {groupedMeetings[date].map(meeting => (
                      <div 
                        key={meeting.id}
                        className={`p-3 border-t border-x last:border-b last:rounded-b ${
                          selectedMeetingIds.includes(meeting.id) 
                            ? 'bg-blue-50' 
                            : isPastDate ? 'bg-gray-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedMeetingIds.includes(meeting.id)}
                              onChange={() => handleMeetingSelect(meeting.id)}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-medium">{meeting.meetingTitle}</div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')} - 
                                {format(new Date(meeting.endTimeIST || meeting.endTime), 'h:mm a')} IST
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            meeting.platform === 'google-meet' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {meeting.platform === 'google-meet' ? 'Google Meet' : 'Zoom'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Existing Users List */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Recent Users</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.slice(0, 5).map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.source}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{format(new Date(user.createdAt), 'MMM d, yyyy')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
