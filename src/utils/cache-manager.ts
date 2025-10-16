
import { openIndexedDB } from './storage';

interface CachedData {
  data: any;
  timestamp: number;
}

export const cacheData = async (key: string, data: any, expirationMinutes = 60): Promise<boolean> => {
  try {
  const db = await openIndexedDB('healthCacheDB', 1);
    if (!db) return false;
    const tx = db.transaction('cachedData', 'readwrite');
    const store = tx.objectStore('cachedData');
    
    const cachedItem: CachedData = {
      data,
      timestamp: Date.now() + expirationMinutes * 60 * 1000
    };
    
    await store.put(cachedItem, key);
    return true;
  } catch (error) {
    console.error('Error caching data:', error);
    return false;
  }
};

export const getCachedData = async (key: string): Promise<any | null> => {
  try {
  const db = await openIndexedDB('healthCacheDB', 1);
    if (!db) return null;
    const tx = db.transaction('cachedData', 'readonly');
    const store = tx.objectStore('cachedData');
    
    const request = store.get(key);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const cachedItem = request.result as CachedData;
        
        if (!cachedItem || Date.now() > cachedItem.timestamp) {
          // Data doesn't exist or has expired
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

export const removeCachedData = async (key: string): Promise<boolean> => {
  try {
  const db = await openIndexedDB('healthCacheDB', 1);
  if (!db) return false;
    const tx = db.transaction('cachedData', 'readwrite');
    const store = tx.objectStore('cachedData');
    
    await store.delete(key);
    return true;
  } catch (error) {
    console.error('Error removing cached data:', error);
    return false;
  }
};

export const clearCache = async (): Promise<boolean> => {
  try {
  const db = await openIndexedDB('healthCacheDB', 1);
  if (!db) return false;
    const tx = db.transaction('cachedData', 'readwrite');
    const store = tx.objectStore('cachedData');
    
    await store.clear();
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

// openIndexedDB is used from src/utils/storage
