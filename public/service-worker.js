// Service Worker for Doc' O Clock
const CACHE_NAME = 'doc-o-clock-cache-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/maskable_icon.png',
  '/src/main.tsx',
  '/src/index.css'
];

// Install event - cache initial assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('Service Worker: Caching files');
      await cache.addAll(ASSETS_TO_CACHE);
      // Ensure offline page is cached
      try {
        const offlineResponse = await fetch(OFFLINE_URL);
        await cache.put(OFFLINE_URL, offlineResponse);
      } catch (error) {
        console.error('Failed to cache offline page:', error);
      }
    })()
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old versions of the cache
      const cacheKeys = await caches.keys();
      const deletePromises = cacheKeys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key));
      
      await Promise.all(deletePromises);
      await self.clients.claim();
      console.log('Service Worker: Active and controlling pages');
    })()
  );
});

// Fetch event - network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(event.request);
        
        // Update cache with fresh response
        const cache = await caches.open(CACHE_NAME);
        try {
          // Only cache successful responses and same-origin requests
          if (networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
            await cache.put(event.request, networkResponse.clone());
          }
        } catch (error) {
          console.error('Failed to update cache:', error);
        }
        
        return networkResponse;
      } catch (error) {
        // Network request failed - try cache
        console.log('Network request failed, trying cache', event.request.url);
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If the request is for a page, show offline page
        if (event.request.mode === 'navigate') {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }
        
        // If all fails, return an error response
        return new Response('Network error occurred', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      }
    })()
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Function to process pending offline actions
async function syncData() {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    
    const actions = await store.getAll();
    
    if (actions.length === 0) {
      return;
    }
    
    console.log(`Processing ${actions.length} pending actions...`);
    
    // Process each action
    for (const action of actions) {
      try {
        // Process the action based on type
        // This is where you'd implement API calls for different action types
        console.log('Processing action:', action);
        
        // If successful, delete the action from store
        await store.delete(action.id);
      } catch (error) {
        console.error('Error processing action:', error);
        // Keep the action in the store to retry later
      }
    }
  } catch (error) {
    console.error('Error in syncData:', error);
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('docOClockOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' });
      }
    };
  });
}

// Listen for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: '/logo192.png',
      badge: '/favicon.ico',
      data: data.data || {},
      vibrate: [100, 50, 100],
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Doc\' O Clock', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsList) => {
      // If a window client is already open, focus it
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (clients.openWindow) {
        const url = event.notification.data.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

console.log('Service Worker: Registered');
