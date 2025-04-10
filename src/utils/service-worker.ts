
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>;
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

// New function to check if app is installed
export const checkIfAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

// New function to handle background sync registration with type checking
export const registerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const extendedReg = registration as ExtendedServiceWorkerRegistration;
      
      // Only call sync.register if the API is available
      if (extendedReg.sync) {
        await extendedReg.sync.register('sync-data');
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

// New function to save data for offline sync later
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
        // Try to trigger sync if we're online
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
