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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name*
                </label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email*
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full p-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone*
              </label>
              <div className="relative">
                <input
                  type="tel"
                  className="w-full p-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+91 9876543210"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Source
              </label>
              <div className="relative">
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white appearance-none"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter</option>
                  <option value="other">Other</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800">Selected Meetings ({selectedMeetingIds.length})</h4>
              </div>
              {selectedMeetingIds.length === 0 ? (
                <div className="text-center py-6">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No meetings selected</p>
                  <p className="text-sm text-gray-400 mt-1">Please select meetings from the list to assign to the user</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedMeetingIds.map(id => {
                    const meeting = meetings.find(m => m.id === id);
                    if (!meeting) return null;
                    
                    return (
                      <div key={id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {format(new Date(meeting.meetingDate), 'MMM d, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                meeting.platform === 'google-meet' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {meeting.platform === 'google-meet' ? 'Google Meet' : 'Zoom'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                          onClick={() => handleMeetingSelect(id)}
                          title="Remove meeting"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-3 ${
                formLoading 
                  ? 'bg-gray-400 cursor-not-allowed opacity-75' 
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
              }`}
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  <span>Creating User...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create User & Add to Meetings</span>
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Meeting Selection */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Select Meetings</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          
          <button
            className="mb-6 px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-gray-700 font-semibold transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-2"
            onClick={fetchMeetings}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-500 border-t-transparent"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh Meetings</span>
              </>
            )}
          </button>
          
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
              <p className="text-gray-600 font-medium">Loading meetings...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-semibold text-lg mb-2">Error Loading Meetings</p>
              <p className="text-red-600">{error}</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-8 text-center bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl">
              <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-bold text-yellow-800 mb-2">No Meetings Found</h3>
              <p className="text-yellow-700 mb-4">
                No meetings available in the selected date range. Try adjusting the dates or create new meetings first.
              </p>
              <button
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg"
                onClick={() => window.location.href = '/admin?tab=calendar'}
              >
                Go to Calendar
              </button>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {sortedDates.map(date => {
                const isDateSelected = selectedDates.includes(date);
                const today = new Date();
                const meetingDate = parseISO(date);
                const isPastDate = !isAfter(meetingDate, today);
                
                return (
                  <div key={date} className="mb-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div 
                      className={`flex justify-between items-center p-4 cursor-pointer transition-all duration-300 ${
                        isDateSelected 
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' 
                          : isPastDate 
                            ? 'bg-gray-50 hover:bg-gray-100' 
                            : 'bg-white hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50'
                      }`}
                      onClick={() => handleDateSelect(date)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                          isDateSelected 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300 hover:border-blue-400'
                        }`}>
                          {isDateSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">
                            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{groupedMeetings[date].length} meeting{groupedMeetings[date].length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isPastDate && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                            Past
                          </span>
                        )}
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${
                          isDateSelected ? 'rotate-90' : ''
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="space-y-2 p-4 pt-0">
                      {groupedMeetings[date].map(meeting => (
                        <div 
                          key={meeting.id}
                          className={`p-4 border-2 rounded-xl transition-all duration-300 ${
                            selectedMeetingIds.includes(meeting.id) 
                              ? 'border-blue-300 bg-blue-50' 
                              : isPastDate 
                                ? 'border-gray-200 bg-gray-50' 
                                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                                selectedMeetingIds.includes(meeting.id) 
                                  ? 'bg-blue-500 border-blue-500' 
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}>
                                {selectedMeetingIds.includes(meeting.id) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div
                                className="cursor-pointer"
                                onClick={() => handleMeetingSelect(meeting.id)}
                              >
                                <div className="font-semibold text-gray-800">{meeting.meetingTitle}</div>
                                <div className="text-sm text-gray-500 flex items-center space-x-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>
                                    {format(new Date(meeting.startTimeIST || meeting.startTime), 'h:mm a')} - 
                                    {format(new Date(meeting.endTimeIST || meeting.endTime), 'h:mm a')} IST
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                              meeting.platform === 'google-meet' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                              {meeting.platform === 'google-meet' ? 'Google Meet' : 'Zoom'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Users Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Recent Users</h3>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            {users.length} total users
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.slice(0, 10).map((user, index) => (
                <tr key={user.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index % 4 === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        index % 4 === 1 ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                        index % 4 === 2 ? 'bg-gradient-to-r from-purple-500 to-violet-600' :
                        'bg-gradient-to-r from-pink-500 to-rose-600'
                      }`}>
                        {(user.firstName?.charAt(0) || user.email?.charAt(0))?.toUpperCase() || 'U'}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{user.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      user.source === 'admin' ? 'bg-indigo-100 text-indigo-800' :
                      user.source === 'website' ? 'bg-green-100 text-green-800' :
                      user.source === 'instagram' ? 'bg-pink-100 text-pink-800' :
                      user.source === 'facebook' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {users.length > 10 && (
          <div className="mt-4 text-center">
            <button
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300 shadow-lg"
              onClick={() => window.location.href = '/admin?tab=users'}
            >
              View All Users ({users.length})
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
