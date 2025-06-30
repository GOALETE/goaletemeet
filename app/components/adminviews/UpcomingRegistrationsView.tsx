import React from 'react';
import { format } from 'date-fns';

interface UpcomingRegistration {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan?: string;
  start?: string;
  end?: string;
}

interface Meeting {
  id: string;
  meetingDate: string;
  platform: string;
  meetingLink: string;
  startTimeIST: string;
  meetingTitle: string;
}

interface UpcomingRegistrationsViewProps {
  loading: boolean;
  upcomingMeetings: Meeting[];
  upcomingRegistrations: UpcomingRegistration[];
  handleRowClick: (userId: string) => void;
  setActiveTab: (tab: string) => void;
}

const UpcomingRegistrationsView: React.FC<UpcomingRegistrationsViewProps> = ({
  loading,
  upcomingMeetings,
  upcomingRegistrations = [], // Add default empty array
  handleRowClick,
  setActiveTab,
}) => (
  <div className="p-4 bg-white rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4">Upcoming Registrations</h2>
    
    {loading ? (
      <div className="py-10 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
      </div>
    ) : (
      <div className="space-y-6">
        {/* Upcoming Meetings Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Upcoming Meetings</h3>
          {!upcomingMeetings || upcomingMeetings.length === 0 ? (
            <p className="text-gray-500">No upcoming meetings scheduled.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="border rounded-lg p-3 bg-blue-50">
                  <h4 className="font-medium">{meeting.meetingTitle || 'Meeting'}</h4>
                  <p className="text-sm">
                    Date: {format(new Date(meeting.meetingDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm">Time: {meeting.startTimeIST}</p>
                  <p className="text-sm">Platform: {meeting.platform}</p>
                  <a 
                    href={meeting.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Meeting Link
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Upcoming Registrations Section */}
        <div>
          <h3 className="text-lg font-medium mb-2">Upcoming Registrations</h3>
          {!upcomingRegistrations || upcomingRegistrations.length === 0 ? (
            <p className="text-gray-500">No upcoming registrations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingRegistrations.map((registration) => (
                    <tr 
                      key={registration.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(registration.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{registration.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{registration.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {registration.start
                            ? format(new Date(registration.start), 'MMM d, yyyy')
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{registration.plan || 'N/A'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

export default UpcomingRegistrationsView;
