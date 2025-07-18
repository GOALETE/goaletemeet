'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types for data refresh events
export type DataRefreshEvent = 
  | 'users'
  | 'meetings' 
  | 'subscriptions'
  | 'analytics'
  | 'calendar'
  | 'all';

interface RefreshContextType {
  triggerRefresh: (event: DataRefreshEvent) => void;
  refreshTriggers: Record<DataRefreshEvent, number>;
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;
  lastRefreshTime: Record<DataRefreshEvent, Date>;
  scheduleRefresh: (event: DataRefreshEvent, delay?: number) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

interface RefreshProviderProps {
  children: ReactNode;
}

export function RefreshProvider({ children }: RefreshProviderProps) {
  const [refreshTriggers, setRefreshTriggers] = useState<Record<DataRefreshEvent, number>>({
    users: 0,
    meetings: 0,
    subscriptions: 0,
    analytics: 0,
    calendar: 0,
    all: 0
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Record<DataRefreshEvent, Date>>({
    users: new Date(),
    meetings: new Date(),
    subscriptions: new Date(),
    analytics: new Date(),
    calendar: new Date(),
    all: new Date()
  });

  const triggerRefresh = useCallback((event: DataRefreshEvent) => {
    console.log(`🔄 Triggering refresh for: ${event}`);
    
    setRefreshTriggers(prev => ({
      ...prev,
      [event]: prev[event] + 1,
      // Also trigger 'all' when any specific refresh happens
      ...(event !== 'all' ? { all: prev.all + 1 } : {})
    }));

    setLastRefreshTime(prev => ({
      ...prev,
      [event]: new Date(),
      ...(event !== 'all' ? { all: new Date() } : {})
    }));

    // Update session storage to track admin activity
    sessionStorage.setItem('lastAdminActivity', Date.now().toString());
  }, []);

  const scheduleRefresh = useCallback((event: DataRefreshEvent, delay: number = 1000) => {
    console.log(`⏰ Scheduling refresh for: ${event} in ${delay}ms`);
    setTimeout(() => {
      triggerRefresh(event);
    }, delay);
  }, [triggerRefresh]);

  const value = {
    triggerRefresh,
    refreshTriggers,
    isRefreshing,
    setIsRefreshing,
    lastRefreshTime,
    scheduleRefresh
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}

// Hook for listening to specific refresh events
export function useRefreshListener(events: DataRefreshEvent | DataRefreshEvent[], callback: () => void | Promise<void>) {
  const { refreshTriggers } = useRefresh();
  
  // Use ref to store the callback to avoid re-running effect when callback changes
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;
  
  // Track previous trigger values to detect changes - initialize with current values
  const prevTriggersRef = React.useRef<Record<DataRefreshEvent, number>>({
    users: 0,
    meetings: 0,
    subscriptions: 0,
    analytics: 0,
    calendar: 0,
    all: 0
  });
  
  React.useEffect(() => {
    const eventArray = Array.isArray(events) ? events : [events];
    
    // Check if any of the relevant events have incremented since last render
    const hasNewTrigger = eventArray.some(event => 
      refreshTriggers[event] > prevTriggersRef.current[event]
    );
    
    if (hasNewTrigger) {
      // Update the previous triggers reference only after detecting a change
      prevTriggersRef.current = { ...refreshTriggers };
      
      // Use a small delay to debounce multiple rapid refresh triggers
      const timeoutId = setTimeout(() => {
        callbackRef.current();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [refreshTriggers, events]); // Removed callback from dependencies
}

// Hook for mutations that trigger refreshes
export function useMutation() {
  const { triggerRefresh, scheduleRefresh, setIsRefreshing } = useRefresh();

  const mutateWithRefresh = useCallback(async (
    mutationFn: () => Promise<any>,
    refreshEvents: DataRefreshEvent | DataRefreshEvent[],
    options?: {
      optimistic?: boolean;
      delay?: number;
      showSuccess?: boolean;
    }
  ) => {
    const { optimistic = false, delay = 0, showSuccess = false } = options || {};
    
    try {
      setIsRefreshing(true);
      
      // For optimistic updates, trigger refresh before mutation
      if (optimistic) {
        const eventArray = Array.isArray(refreshEvents) ? refreshEvents : [refreshEvents];
        eventArray.forEach(event => {
          if (delay > 0) {
            scheduleRefresh(event, delay);
          } else {
            triggerRefresh(event);
          }
        });
      }
      
      // Execute the mutation
      const result = await mutationFn();
      
      // For pessimistic updates, trigger refresh after mutation
      if (!optimistic) {
        const eventArray = Array.isArray(refreshEvents) ? refreshEvents : [refreshEvents];
        eventArray.forEach(event => {
          if (delay > 0) {
            scheduleRefresh(event, delay);
          } else {
            triggerRefresh(event);
          }
        });
      }
      
      return result;
    } finally {
      setIsRefreshing(false);
    }
  }, [triggerRefresh, scheduleRefresh, setIsRefreshing]);

  return { mutateWithRefresh, triggerRefresh, scheduleRefresh };
}
