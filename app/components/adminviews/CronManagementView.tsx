'use client';

import { useState } from 'react';

interface CronResult {
  success: boolean;
  message: string;
  timestamp: string;
  metrics?: {
    duration: number;
    successRate?: number;
  };
  meetingDetails?: {
    id: string;
    date: string;
    platform: string;
    startTime: string;
    endTime: string;
    title: string;
  };
  invitesSent?: Array<{
    userId: string;
    email: string;
    status: string;
    error?: string;
  }>;
}

export default function CronManagementView() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CronResult | null>(null);
  const [error, setError] = useState('');

  const triggerCronJob = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const adminPasscode = sessionStorage.getItem('adminPasscode');
      if (!adminPasscode) {
        setError('Admin authentication missing');
        return;
      }

      const response = await fetch('/api/admin/trigger-cron', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminPasscode}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to trigger cron job');
      }

      setLastResult(data.cronResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      console.error('Error triggering cron job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Cron Job Management</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Daily Invite Cron Job</h3>
        <p className="text-gray-600 mb-4">
          This cron job runs daily to send meeting invites to users with active subscriptions. 
          It will use admin-created meetings if available, or create default meetings automatically.
        </p>
        
        <button
          onClick={triggerCronJob}
          disabled={isLoading}
          className={`px-6 py-2 rounded font-medium transition-colors ${
            isLoading 
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Triggering...
            </span>
          ) : (
            'Trigger Cron Job Manually'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="font-semibold text-red-800">Error</h4>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {lastResult && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Last Cron Job Result</h3>
          <div className={`p-4 rounded border ${
            lastResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Status</h4>
                <p className={lastResult.success ? 'text-green-600' : 'text-red-600'}>
                  {lastResult.success ? '✅ Success' : '❌ Failed'}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold">Timestamp</h4>
                <p className="text-gray-600">
                  {new Date(lastResult.timestamp).toLocaleString()}
                </p>
              </div>

              {lastResult.metrics && (
                <>
                  <div>
                    <h4 className="font-semibold">Duration</h4>
                    <p className="text-gray-600">{lastResult.metrics.duration}ms</p>
                  </div>
                  
                  {lastResult.metrics.successRate !== undefined && (
                    <div>
                      <h4 className="font-semibold">Success Rate</h4>
                      <p className="text-gray-600">{lastResult.metrics.successRate.toFixed(1)}%</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4">
              <h4 className="font-semibold">Message</h4>
              <p className="text-gray-600">{lastResult.message}</p>
            </div>

            {lastResult.meetingDetails && (
              <div className="mt-4">
                <h4 className="font-semibold">Meeting Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <p><strong>ID:</strong> {lastResult.meetingDetails.id}</p>
                  <p><strong>Platform:</strong> {lastResult.meetingDetails.platform}</p>
                  <p><strong>Date:</strong> {lastResult.meetingDetails.date}</p>
                  <p><strong>Time:</strong> {new Date(lastResult.meetingDetails.startTime).toLocaleString()}</p>
                </div>
              </div>
            )}

            {lastResult.invitesSent && lastResult.invitesSent.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold">Invite Results ({lastResult.invitesSent.length} users)</h4>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Email</th>
                        <th className="text-left py-1">Status</th>
                        <th className="text-left py-1">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastResult.invitesSent.map((invite, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-1">{invite.email}</td>
                          <td className="py-1">
                            <span className={`px-2 py-1 rounded text-xs ${
                              invite.status === 'sent' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {invite.status}
                            </span>
                          </td>
                          <td className="py-1 text-red-600">{invite.error || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">How it works:</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>Admin Priority:</strong> If you've created meetings using the calendar, those will be used</li>
          <li>• <strong>Auto Fallback:</strong> If no admin meetings exist, default meetings are created automatically</li>
          <li>• <strong>User Management:</strong> Active users are automatically added to meetings and sent invites</li>
          <li>• <strong>Smart Updates:</strong> If users have active subscriptions but aren't in the meeting, they're added automatically</li>
          <li>• <strong>Messaging:</strong> Uses the unified messaging service (currently email, WhatsApp support coming soon)</li>
        </ul>
      </div>
    </div>
  );
}
