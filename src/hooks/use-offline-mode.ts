
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { saveForOfflineSync, registerBackgroundSync } from '@/utils/service-worker';

export interface OfflineAction {
  type: string;
  payload: any;
  timestamp?: string;
  id?: string;
}

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);
  const [offlineFeatures, setOfflineFeatures] = useState({
    appointments: true,
    messages: true,
    profile: true,
    prescriptions: true
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("You're back online!", { id: "online-status" });
      syncOfflineActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You're offline. Some features will be limited.", 
        { duration: Infinity, id: "online-status" });
    };

    // Load any pending actions from IndexedDB
    const loadPendingActions = async () => {
      try {
        const db = await openOfflineDB();
        const tx = db.transaction('pendingActions', 'readonly');
        const store = tx.objectStore('pendingActions');
        
        return new Promise<OfflineAction[]>((resolve) => {
          const request = store.getAll();
          request.onsuccess = () => {
            if (request.result) {
              setOfflineActions(request.result as OfflineAction[]);
              resolve(request.result as OfflineAction[]);
            } else {
              resolve([]);
            }
          };
          request.onerror = () => {
            console.error("Error loading offline actions:", request.error);
            resolve([]);
          };
        });
      } catch (error) {
        console.error("Error loading offline actions:", error);
        return [];
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.onLine) {
      loadPendingActions();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineActions = async () => {
    if (navigator.onLine && offlineActions.length > 0) {
      toast.loading("Syncing offline changes...", { id: "sync-toast" });
      
      try {
        await registerBackgroundSync();
        toast.success(`Syncing ${offlineActions.length} changes in background`, 
          { id: "sync-toast" });
        setOfflineActions([]);
      } catch (error) {
        console.error("Sync error:", error);
        toast.error("Failed to sync some changes", { id: "sync-toast" });
      }
    }
  };

  const queueOfflineAction = async (action: OfflineAction) => {
    const actionWithMeta = {
      ...action,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };
    
    try {
      const success = await saveForOfflineSync(actionWithMeta);
      if (success) {
        setOfflineActions(prev => [...prev, actionWithMeta]);
        toast.success("Change saved for when you're back online");
        return true;
      }
    } catch (error) {
      console.error("Error saving offline action:", error);
      toast.error("Failed to save change for offline use");
    }
    return false;
  };

  const openOfflineDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('docOClockOfflineDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'key' });
        }
      };
    });
  };

  // Cache data for offline use
  const cacheForOffline = async (key: string, data: any) => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction('offlineData', 'readwrite');
      const store = tx.objectStore('offlineData');
      
      return new Promise<boolean>((resolve) => {
        const request = store.put({
          key,
          data,
          timestamp: new Date().toISOString()
        });
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.error("Error caching data:", request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error("Error caching data:", error);
      return false;
    }
  };

  // Get cached data for offline use
  const getOfflineCache = async (key: string) => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction('offlineData', 'readonly');
      const store = tx.objectStore('offlineData');
      
      return new Promise<any>((resolve) => {
        const request = store.get(key);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.data);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error("Error getting cached data:", request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error("Error getting cached data:", error);
      return null;
    }
  };

  return {
    isOnline,
    offlineActions,
    offlineFeatures,
    queueOfflineAction,
    cacheForOffline,
    getOfflineCache,
    syncOfflineActions
  };
}
