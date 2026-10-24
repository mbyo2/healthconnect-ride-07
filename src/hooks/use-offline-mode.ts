
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { openIndexedDB, safeCryptoUUID } from '@/utils/storage';

export interface OfflineAction {
  id: string;  // Single id property
  type: string;
  table?: string;
  data?: any; // For update operations
  timestamp?: string;
  // Set when sync attempted the action and it failed — the entry is RETAINED
  // (never silently dropped) so the queue UI keeps showing it as pending
  // with its failure reason.
  status?: 'pending' | 'failed';
  error?: string;
}

// Map of features and their availability in offline mode
interface OfflineFeatures {
  appointments: boolean;
  prescriptions: boolean;
  payments: boolean;
  messages: boolean;
  profile: boolean;
  search: boolean;
}

export const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const { toast } = useToast();

  // Offline features availability
  const [offlineFeatures, setOfflineFeatures] = useState<OfflineFeatures>({
    appointments: true,
    prescriptions: true,
    payments: false,
    messages: false,
    profile: true,
    search: false
  });

  // Handle connection status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "You're back online",
        description: pendingActions.length > 0 ? 
          "Synchronizing your offline actions..." : undefined
      });
      
      if (pendingActions.length > 0) {
        syncPendingActions();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Changes will be saved and synchronized when you're back online",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load any pending actions on init
    loadPendingActions();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions.length]);

  // Load pending actions from IndexedDB (resilient to environments where IndexedDB is blocked)
  const loadPendingActions = async () => {
    try {
  const db = await openIndexedDB('offlineActionsDB', 1);
      if (!db) {
        // IndexedDB unavailable (e.g., Safari private mode) - silently continue with empty pending actions
        setPendingActions([]);
        return;
      }

      const tx = db.transaction('pendingActions', 'readonly');
      const store = tx.objectStore('pendingActions');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        setPendingActions(request.result as OfflineAction[]);
      };
      
      request.onerror = () => {
        console.error('Error loading pending actions:', request.error);
      };
    } catch (error) {
      console.error('Error loading pending actions from IndexedDB:', error);
      setPendingActions([]);
    }
  };

  // Queue an action to be processed when online
  const queueOfflineAction = useCallback(async (action: OfflineAction) => {
    try {
      const actionWithMeta: OfflineAction = {
        ...action,
        id: action.id || safeCryptoUUID(),
        timestamp: new Date().toISOString(),
      };
      
      const db = await openIndexedDB('offlineActionsDB', 1);
      if (!db) {
        // IndexedDB unavailable - fall back to in-memory queue
        setPendingActions(prev => [...prev, actionWithMeta]);
        return true;
      }

      const tx = db.transaction('pendingActions', 'readwrite');
      const store = tx.objectStore('pendingActions');
      
      const request = store.add(actionWithMeta);
      
      request.onsuccess = () => {
        setPendingActions(prev => [...prev, actionWithMeta]);
      };
      
      request.onerror = () => {
        console.error('Error adding pending action:', request.error);
        throw new Error('Failed to queue offline action');
      };
      
      return true;
    } catch (error) {
      console.error('Error queueing offline action:', error);
      return false;
    }
  }, []);

  // Mark an action as failed WITHOUT removing it — a failed/offline change
  // must stay visible in the queue (with its error) until it truly syncs.
  // Persisted to IndexedDB so the failure state survives the reload below.
  const markActionFailed = async (action: OfflineAction, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || 'Sync failed');
    const failed: OfflineAction = { ...action, status: 'failed', error: message };
    setPendingActions(prev => prev.map(a => (a.id === action.id ? failed : a)));
    try {
      const db = await openIndexedDB('offlineActionsDB', 1);
      if (!db) return;
      const tx = db.transaction('pendingActions', 'readwrite');
      const store = tx.objectStore('pendingActions');
      await store.put(failed);
    } catch (e) {
      console.error('Error marking offline action as failed:', e);
    }
  };

  // Process queued actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return;

    for (const action of pendingActions) {
      try {
        await processOfflineAction(action);
        await removeCompletedAction(action.id);
      } catch (error) {
        // FAIL LOUDLY: retain the entry, stamp it with the error, and tell
        // the user — never remove an action that did not actually sync.
        console.error(`Error processing action ${action.type}:`, error);
        await markActionFailed(action, error);
        toast({
          title: "Offline change failed to sync",
          description: error instanceof Error ? error.message : "A queued change could not be synced and was kept in the queue.",
          variant: "destructive",
        });
      }
    }

    // Reload pending actions to update UI
    loadPendingActions();
  }, [isOnline, pendingActions]);

  // Process a single offline action.
  // ENGINE RULE (P1-28): an action type with no real server implementation
  // must THROW — syncPendingActions only removes an entry after this
  // resolves, so throwing retains the entry and marks it failed. Previously
  // UPDATE_PRESCRIPTION_STATUS fell through with `break`, so a status change
  // queued offline was silently deleted as "completed" while the server
  // still showed the old status (double-dispense risk).
  const processOfflineAction = async (action: OfflineAction) => {
    console.log('Processing offline action:', action);

    switch (action.type) {
      case 'UPDATE_PRESCRIPTION_STATUS':
        // No server sync path exists for offline prescription status
        // updates in this hook — fail loudly instead of vanishing.
        throw new Error(
          'Prescription status changes made offline cannot be synced — the server record was NOT updated. Re-check the prescription status while online before dispensing.'
        );

      // Add more cases for different action types — each case must either
      // perform the real server write or throw.

      default:
        throw new Error(
          `Offline action "${action.type}" has no sync implementation — this change was NOT saved to the server.`
        );
    }
  };

  // Remove an action after it's been processed
  const removeCompletedAction = async (actionId: string) => {
    try {
      const db = await openIndexedDB('offlineActionsDB', 1);
      if (!db) {
        // If no DB, just remove from in-memory queue
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
        return;
      }

      const tx = db.transaction('pendingActions', 'readwrite');
      const store = tx.objectStore('pendingActions');
      
      await store.delete(actionId);
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } catch (error) {
      console.error('Error removing completed action:', error);
    }
  };

  // Cache data for offline use
  // NOTE: wrapped in useCallback with a stable identity — consumers put this
  // in useEffect dependency arrays, and a new identity per render caused an
  // infinite reload loop (e.g. pharmacy Rx Fulfillment spinning forever).
  const cacheForOffline = useCallback(async (key: string, data: any, expirationMinutes = 60): Promise<boolean> => {
    try {
      const db = await openIndexedDB('offlineActionsDB', 1);
      if (!db) {
        // IndexedDB unavailable - skip caching but don't fail
        return false;
      }

      const tx = db.transaction('offlineData', 'readwrite');
      const store = tx.objectStore('offlineData');
      
      const cachedItem = {
        key,
        data,
        timestamp: Date.now() + expirationMinutes * 60 * 1000
      };
      
      await store.put(cachedItem);
      return true;
    } catch (error) {
      console.error('Error caching data for offline use:', error);
      return false;
    }
  }, []);

  // Get cached data
  // NOTE: useCallback for the same stable-identity reason as cacheForOffline.
  const getOfflineCache = useCallback(async (key: string): Promise<any | null> => {
    try {
      const db = await openIndexedDB('offlineActionsDB', 1);
      if (!db) return null;

      const tx = db.transaction('offlineData', 'readonly');
      const store = tx.objectStore('offlineData');
      
      const request = store.get(key);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const cachedItem = request.result;
          
          if (!cachedItem || Date.now() > cachedItem.timestamp) {
            resolve(null);
            return;
          }
          
          resolve(cachedItem.data);
        };
        
        request.onerror = () => {
          console.error('Error retrieving cached data:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }, []);

  // Open the offline database. Return null if IndexedDB is unavailable or blocked (e.g., Safari private mode)
  const openOfflineDB = (): Promise<IDBDatabase | null> => {
    return openIndexedDB('offlineActionsDB', 1);
  };

  return {
    isOnline,
    queueOfflineAction,
    pendingActions,
    syncPendingActions,
    offlineFeatures,
    // Caching functions
    cacheForOffline,
    getOfflineCache
  };
};
