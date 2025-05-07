
export interface CacheOptions {
  strategy?: 'cache-first' | 'network-first';
  maxAge?: number; // In milliseconds
  cacheName?: string;
}

export const DEFAULT_CACHE_NAME = 'doc-o-clock-dynamic-v1';
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours by default

export async function cacheData<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  options: CacheOptions = {}
): Promise<T> {
  const {
    strategy = 'network-first',
    maxAge = DEFAULT_MAX_AGE,
    cacheName = DEFAULT_CACHE_NAME
  } = options;

  // Helper to store data in the cache
  const storeInCache = async (data: T) => {
    try {
      // Store in both IndexedDB (for good offline support) and Cache API (for service worker)
      const db = await openOfflineDB();
      const tx = db.transaction('offlineData', 'readwrite');
      const store = tx.objectStore('offlineData');
      
      await store.put({
        key,
        data,
        timestamp: Date.now(),
        maxAge
      });
      
      // Also store in Cache API for service worker
      if ('caches' in window) {
        const cache = await caches.open(cacheName);
        const response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${Math.floor(maxAge / 1000)}`,
            'X-Cache-Timestamp': Date.now().toString(),
            'X-Cache-Key': key
          }
        });
        await cache.put(`/__cache/${encodeURIComponent(key)}`, response);
      }
    } catch (error) {
      console.error('Error storing data in cache:', error);
    }
  };
  
  // Helper to get data from IndexedDB
  const getFromIndexedDB = async (): Promise<{ data: T; timestamp: number } | null> => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction('offlineData', 'readonly');
      const store = tx.objectStore('offlineData');
      const item = await store.get(key);
      
      if (item) {
        return { data: item.data, timestamp: item.timestamp };
      }
    } catch (error) {
      console.error('Error getting data from IndexedDB:', error);
    }
    return null;
  };
  
  // Helper to get data from Cache API
  const getFromCacheAPI = async (): Promise<{ data: T; timestamp: number } | null> => {
    if ('caches' in window) {
      try {
        const cache = await caches.open(cacheName);
        const response = await cache.match(`/__cache/${encodeURIComponent(key)}`);
        
        if (response) {
          const timestamp = parseInt(response.headers.get('X-Cache-Timestamp') || '0', 10);
          const maxAgeHeader = parseInt(response.headers.get('Cache-Control')?.split('max-age=')[1] || '0', 10);
          const actualMaxAge = maxAgeHeader * 1000 || maxAge;
          
          if (timestamp + actualMaxAge > Date.now()) {
            const data = await response.json();
            return { data, timestamp };
          }
        }
      } catch (error) {
        console.error('Error getting data from Cache API:', error);
      }
    }
    return null;
  };
  
  if (strategy === 'cache-first') {
    // Try cache first, then network
    const cachedData = await getFromIndexedDB() || await getFromCacheAPI();
    
    if (cachedData) {
      // Refresh cache in background if online but don't wait for it
      if (navigator.onLine) {
        fetchFn()
          .then(freshData => storeInCache(freshData))
          .catch(error => console.error('Background refresh failed:', error));
      }
      
      return cachedData.data;
    }
    
    // If not in cache or expired, fetch from network
    try {
      const data = await fetchFn();
      await storeInCache(data);
      return data;
    } catch (error) {
      throw error;
    }
  } else {
    // Network first, then cache
    if (navigator.onLine) {
      try {
        const data = await fetchFn();
        await storeInCache(data);
        return data;
      } catch (error) {
        // Fall back to cache on network error
        const cachedData = await getFromIndexedDB() || await getFromCacheAPI();
        if (cachedData) {
          console.info('Network request failed, using cached data from', 
            new Date(cachedData.timestamp).toLocaleString());
          return cachedData.data;
        }
        throw error;
      }
    } else {
      // If offline, go straight to cache
      const cachedData = await getFromIndexedDB() || await getFromCacheAPI();
      
      if (cachedData) {
        return cachedData.data;
      }
      
      throw new Error('You are offline and the requested data is not available in the cache');
    }
  }
}

export async function invalidateCache(key: string, cacheName = DEFAULT_CACHE_NAME): Promise<void> {
  try {
    // Remove from IndexedDB
    const db = await openOfflineDB();
    const tx = db.transaction('offlineData', 'readwrite');
    const store = tx.objectStore('offlineData');
    await store.delete(key);
    
    // Remove from Cache API
    if ('caches' in window) {
      const cache = await caches.open(cacheName);
      await cache.delete(`/__cache/${encodeURIComponent(key)}`);
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

export async function prefetchData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<void> {
  try {
    const data = await fetchFn();
    const {
      maxAge = DEFAULT_MAX_AGE,
      cacheName = DEFAULT_CACHE_NAME
    } = options;
    
    // Store in both IndexedDB and Cache API
    const db = await openOfflineDB();
    const tx = db.transaction('offlineData', 'readwrite');
    const store = tx.objectStore('offlineData');
    
    await store.put({
      key,
      data,
      timestamp: Date.now(),
      maxAge
    });
    
    if ('caches' in window) {
      const cache = await caches.open(cacheName);
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${Math.floor(maxAge / 1000)}`,
          'X-Cache-Timestamp': Date.now().toString(),
          'X-Cache-Key': key
        }
      });
      await cache.put(`/__cache/${encodeURIComponent(key)}`, response);
    }
  } catch (error) {
    console.error('Error prefetching data:', error);
  }
}

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
