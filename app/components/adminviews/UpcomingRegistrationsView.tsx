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
  upcomingRegistrations,
  handleRowClick,
  setActiveTab,
}) => (
  <div className="p-4">
    <h2>Upcoming Registrations</h2>
    {upcomingRegistrations.length === 0 ? (
      <p>No upcoming registrations found.</p>
    ) : (
      <ul>
        {upcomingRegistrations.map((registration: UpcomingRegistration) => (
          <li key={registration.id}>
            <p>
              <strong>{registration.name}</strong>
            </p>
            <p>
              Date:{' '}
              {registration.start
                ? format(new Date(registration.start), 'MMMM d, yyyy')
                : 'N/A'}
            </p>
            <p>Location: {registration.plan}</p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default UpcomingRegistrationsView;
