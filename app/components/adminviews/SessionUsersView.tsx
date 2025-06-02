import React from 'react';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan?: string;
};

interface SessionUsersViewProps {
  sessionDate: string;
  setSessionDate: (date: string) => void;
  sessionUsers: SessionUser[];
  sessionUsersLoading: boolean;
}

const SessionUsersView: React.FC<SessionUsersViewProps> = ({ sessionDate, setSessionDate, sessionUsers, sessionUsersLoading }) => (
  <div className="p-4">
    <h2>Session Users</h2>
    <ul>
      {sessionUsers.map((user: SessionUser) => (
        <li key={user.id}>
          {user.name}
        </li>
      ))}
    </ul>
  </div>
);

export default SessionUsersView;
