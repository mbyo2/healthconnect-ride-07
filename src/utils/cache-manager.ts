
import { toast } from 'sonner';

// Cache keys for different types of data
export const CACHE_KEYS = {
  USER_PROFILE: 'user-profile',
  APPOINTMENTS: 'appointments',
  PROVIDERS: 'providers',
  MEDICATIONS: 'medications',
  PRESCRIPTIONS: 'prescriptions',
  CHAT_MESSAGES: 'chat-messages',
  NOTIFICATIONS: 'notifications',
  PAYMENT_HISTORY: 'payment-history',
};

/**
 * Opens a connection to the cache database
 */
const openCacheDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('docOClockCacheDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/**
 * Saves data to the cache
 */
export const saveToCache = async (key: string, data: any, expirationMinutes = 60): Promise<boolean> => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    
    const timestamp = new Date();
    const expiration = new Date(timestamp.getTime() + (expirationMinutes * 60000));
    
    const entry = {
      key,
      data,
      timestamp: timestamp.toISOString(),
      expiration: expiration.toISOString()
    };
    
    return new Promise<boolean>((resolve) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Error saving to cache:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Cache save error:', error);
    return false;
  }
};

/**
 * Retrieves data from the cache
 */
export const getFromCache = async (key: string): Promise<any> => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');
    
    return new Promise((resolve) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const entry = request.result;
        
        if (!entry) {
          resolve(null);
          return;
        }
        
        // Check if entry is expired
        const now = new Date();
        const expiration = new Date(entry.expiration);
        
        if (now > expiration) {
          // Data is expired, remove it from cache
          const deleteTx = db.transaction('cache', 'readwrite');
          const deleteStore = deleteTx.objectStore('cache');
          deleteStore.delete(key);
          resolve(null);
          return;
        }
        
        resolve(entry.data);
      };
      
      request.onerror = () => {
        console.error('Error retrieving from cache:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
};

/**
 * Clears expired cache entries
 */
export const clearExpiredCache = async (): Promise<void> => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const now = new Date().toISOString();
    
    const index = store.index('timestamp');
    const request = index.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const entry = cursor.value;
        if (entry.expiration < now) {
          store.delete(entry.key);
        }
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
};

/**
 * Clears all cache data
 */
export const clearAllCache = async (): Promise<boolean> => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    
    return new Promise<boolean>((resolve) => {
      const request = store.clear();
      request.onsuccess = () => {
        toast.success('Cache cleared successfully');
        resolve(true);
      };
      request.onerror = () => {
        console.error('Error clearing cache:', request.error);
        toast.error('Failed to clear cache');
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    toast.error('Failed to clear cache');
    return false;
  }
};
