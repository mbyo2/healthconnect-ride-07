
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
}

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      console.info('ServiceWorker registration successful with scope:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show notification to user
              console.log('New version available! Ready to update.');
              // You could trigger a toast notification here
            }
          });
        }
      });
      
      // Set up periodic sync if supported
      if ('periodicSync' in registration) {
        const extendedReg = registration as ExtendedServiceWorkerRegistration;
        
        // Request permission to use periodic sync
        if ('permissions' in navigator) {
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync' as any,
          });
          
          if (status.state === 'granted' && extendedReg.periodicSync) {
            try {
              await extendedReg.periodicSync.register('content-sync', {
                minInterval: 24 * 60 * 60 * 1000, // once a day
              });
              console.log('Periodic sync registered');
            } catch (error) {
              console.error('Periodic sync registration failed:', error);
            }
          }
        }
      }
      
      return registration;
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  } else {
    console.info('ServiceWorker is not supported in this browser');
  }
  
  return null;
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const result = await registration.unregister();
      console.info('ServiceWorker unregistration result:', result);
      return result;
    } catch (error) {
      console.error('ServiceWorker unregistration failed:', error);
    }
  }
  
  return false;
};

export const checkServiceWorkerStatus = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  }
  
  return false;
};

export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

export const checkIfAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

export const registerBackgroundSync = async (tag: string = 'sync-data') => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const extendedReg = registration as ExtendedServiceWorkerRegistration;
      
      if (extendedReg.sync) {
        await extendedReg.sync.register(tag);
        console.log('Background sync registered!');
        return true;
      } else {
        console.warn('Background Sync API not available in this browser');
        return false;
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }
  
  return false;
};

// Optimized function to save data for offline sync
export const saveForOfflineSync = async (action: any) => {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    
    // Add unique ID and timestamp
    const actionWithMeta = {
      ...action,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    await store.add(actionWithMeta);
    
    return new Promise<boolean>((resolve) => {
      tx.oncomplete = () => {
        if (navigator.onLine) {
          registerBackgroundSync().then(() => resolve(true));
        } else {
          resolve(true);
        }
      };
      
      tx.onerror = () => {
        console.error('Transaction error:', tx.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Error saving action for offline sync:', error);
    return false;
  }
};

// Updated function to update or reload service worker
export const updateServiceWorker = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let updated = false;
      
      for (const registration of registrations) {
        await registration.update();
        updated = true;
      }
      
      return updated;
    } catch (error) {
      console.error('Error updating service worker:', error);
      return false;
    }
  }
  return false;
};

// Clear all cached data
export const clearCache = async (): Promise<boolean> => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }
  return false;
};

// Helper function to open the IndexedDB database
const openDB = async (): Promise<IDBDatabase> => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('docOClockOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' });
      }
    };
  });
};
