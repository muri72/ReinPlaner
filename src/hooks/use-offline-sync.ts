"use client";

import { useState, useEffect } from "react";

interface OfflineAction {
  id: string;
  type: 'time_entry' | 'order_update' | 'order_create' | 'assignment_change';
  data: any;
  timestamp: number;
}

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isOffline: boolean;
  pendingActions: OfflineAction[];
  addAction: (action: OfflineAction) => void;
  syncActions: () => Promise<void>;
  clearPendingActions: () => void;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Load pending actions from localStorage
    const stored = localStorage.getItem('offlineActions');
    if (stored) {
      try {
        setPendingActions(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading offline actions:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save pending actions to localStorage
    if (pendingActions.length > 0) {
      localStorage.setItem('offlineActions', JSON.stringify(pendingActions));
    }
  }, [pendingActions]);

  const addAction = (action: OfflineAction) => {
    const newAction = {
      ...action,
      timestamp: Date.now(),
    };
    setPendingActions(prev => [...prev, newAction]);
  };

  const syncActions = async () => {
    if (!isOnline || pendingActions.length === 0) {
      return;
    }

    try {
      for (const action of pendingActions) {
        // Implement actual sync logic based on action type
        switch (action.type) {
          case 'time_entry':
            // Sync time entry
            await fetch('/api/time-entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data),
            });
            break;
          case 'order_update':
            // Sync order update
            await fetch(`/api/orders/${action.data.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data),
            });
            break;
          case 'order_create':
            // Sync order creation
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data),
            });
            break;
          case 'assignment_change':
            // Sync assignment change
            await fetch(`/api/assignments/${action.data.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data),
            });
            break;
        }
      }

      // Clear synced actions
      setPendingActions([]);
      localStorage.removeItem('offlineActions');
    } catch (error) {
      console.error('Error syncing actions:', error);
    }
  };

  const clearPendingActions = () => {
    setPendingActions([]);
    localStorage.removeItem('offlineActions');
  };

  return {
    isOnline,
    isOffline: !isOnline,
    pendingActions,
    addAction,
    syncActions,
    clearPendingActions,
  };
}