
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface OfflineAction {
  id: string;  // Single id property
  type: string;
  table?: string;
  data?: any; // For update operations
  timestamp?: string;
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

  // Load pending actions from IndexedDB
  const loadPendingActions = async () => {
    try {
      const db = await openOfflineDB();
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
    }
  };

  // Queue an action to be processed when online
  const queueOfflineAction = useCallback(async (action: OfflineAction) => {
    try {
      const actionWithMeta: OfflineAction = {
        ...action,
        id: action.id || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      
      const db = await openOfflineDB();
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

  // Process queued actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return;

    for (const action of pendingActions) {
      try {
        await processOfflineAction(action);
        await removeCompletedAction(action.id);
      } catch (error) {
        console.error(`Error processing action ${action.type}:`, error);
      }
    }
    
    // Reload pending actions to update UI
    loadPendingActions();
  }, [isOnline, pendingActions]);

  // Process a single offline action
  const processOfflineAction = async (action: OfflineAction) => {
    console.log('Processing offline action:', action);
    
    // Here you'd implement different strategies for each action type
    // This is just an example and should be expanded based on your needs
    switch (action.type) {
      case 'UPDATE_PRESCRIPTION_STATUS':
        // Handle prescription status update
        break;
        
      // Add more cases for different action types
        
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  };

  // Remove an action after it's been processed
  const removeCompletedAction = async (actionId: string) => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction('pendingActions', 'readwrite');
      const store = tx.objectStore('pendingActions');
      
      await store.delete(actionId);
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } catch (error) {
      console.error('Error removing completed action:', error);
    }
  };

  // Cache data for offline use
  const cacheForOffline = async (key: string, data: any, expirationMinutes = 60): Promise<boolean> => {
    try {
      const db = await openOfflineDB();
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
  };

  // Get cached data
  const getOfflineCache = async (key: string): Promise<any | null> => {
    try {
      const db = await openOfflineDB();
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
  };

  // Open the offline database
  const openOfflineDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('offlineActionsDB', 1);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('pendingActions')) {
          const store = db.createObjectStore('pendingActions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
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
