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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200/50">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Cron Job Management
            </h2>
            <p className="text-gray-600 mt-1">Automate meeting invites and user management</p>
          </div>
        </div>
      </div>
      
      {/* Main Control Panel */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Daily Invite Cron Job</h3>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200/50 mb-6">
          <p className="text-indigo-800 leading-relaxed">
            This automated system runs daily to send meeting invites to users with active subscriptions. 
            It intelligently uses admin-created meetings when available, or creates default meetings automatically to ensure seamless operations.
          </p>
        </div>
        
        <button
          onClick={triggerCronJob}
          disabled={isLoading}
          className={`px-8 py-4 rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-3 ${
            isLoading 
              ? 'bg-gray-400 text-white cursor-not-allowed transform-none'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-xl'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Executing Cron Job...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Trigger Cron Job Manually</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-red-800 text-lg">Execution Error</h4>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className={`p-2 rounded-lg ${
              lastResult.success 
                ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {lastResult.success ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Last Execution Result</h3>
          </div>
          
          <div className={`p-6 rounded-xl border-2 ${
            lastResult.success 
              ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200/50' 
              : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200/50'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-gray-800 mb-2 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Status</span>
                  </h4>
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full font-semibold ${
                    lastResult.success 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50' 
                      : 'bg-red-100 text-red-800 border border-red-300/50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      lastResult.success ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></div>
                    <span>{lastResult.success ? 'Success' : 'Failed'}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-800 mb-2 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Timestamp</span>
                  </h4>
                  <p className="text-gray-700 font-medium">
                    {new Date(lastResult.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {lastResult.metrics && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Duration</span>
                    </h4>
                    <p className="text-gray-700 font-medium">{lastResult.metrics.duration}ms</p>
                  </div>
                  
                  {lastResult.metrics.successRate !== undefined && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2 flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Success Rate</span>
                      </h4>
                      <p className="text-gray-700 font-medium">{lastResult.metrics.successRate.toFixed(1)}%</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Message</span>
              </h4>
              <p className="text-gray-700 bg-white/70 p-4 rounded-lg border border-gray-200/50">{lastResult.message}</p>
            </div>

            {lastResult.meetingDetails && (
              <div className="mb-6">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Meeting Details</span>
                </h4>
                <div className="bg-white/70 p-4 rounded-lg border border-gray-200/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">ID:</span>
                      <p className="text-gray-800">{lastResult.meetingDetails.id}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Platform:</span>
                      <p className="text-gray-800 capitalize">{lastResult.meetingDetails.platform}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Date:</span>
                      <p className="text-gray-800">{lastResult.meetingDetails.date}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Time:</span>
                      <p className="text-gray-800">{new Date(lastResult.meetingDetails.startTime).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lastResult.invitesSent && lastResult.invitesSent.length > 0 && (
              <div>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Invite Results ({lastResult.invitesSent.length} users)</span>
                </h4>
                <div className="bg-white/70 rounded-lg border border-gray-200/50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50/70 sticky top-0">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/50">
                        {lastResult.invitesSent.map((invite, index) => (
                          <tr key={index} className="hover:bg-gray-50/50">
                            <td className="py-3 px-4 text-gray-800">{invite.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                invite.status === 'sent' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50' 
                                  : 'bg-red-100 text-red-800 border border-red-300/50'
                              }`}>
                                {invite.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-red-600 text-xs">{invite.error || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-bold text-blue-800 text-lg">How the System Works</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-blue-800">Admin Priority</h5>
                <p className="text-blue-700 text-sm">Uses meetings you create through the calendar interface first</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-blue-800">Auto Fallback</h5>
                <p className="text-blue-700 text-sm">Creates default meetings automatically when none exist</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-blue-800">User Management</h5>
                <p className="text-blue-700 text-sm">Automatically adds active users to meetings and sends invites</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-blue-800">Smart Updates</h5>
                <p className="text-blue-700 text-sm">Detects users with active subscriptions not in meetings and adds them</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-blue-800">Unified Messaging</h5>
                <p className="text-blue-700 text-sm">Uses the messaging service for emails (WhatsApp support coming soon)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
