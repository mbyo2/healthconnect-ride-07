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
  '/d0c-icon.svg',
  '/src/main.tsx',
  '/src/index.css'
];

// Track failed requests to retry when back online
const failedRequests = new Map();

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

// Network first, falling back to cache
async function networkFirstStrategy(request) {
  const requestKey = request.url + (request.method || 'GET');
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Remove from failed requests if it was there
      failedRequests.delete(requestKey);
      
      // Update cache with fresh response
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response was not ok');
  } catch (error) {
    console.log('Network request failed, trying cache', request.url);
    
    // Store failed request to retry later
    failedRequests.set(requestKey, request.clone());
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If request mode is navigate, show offline page
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
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
}

// Cache first for static assets, network first for API and dynamic content
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('Error fetching and caching:', error);
    throw error;
  }
}

// Fetch event - implement strategy based on request type
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Use cache first for static assets
  if (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // Use network first for everything else
  event.respondWith(networkFirstStrategy(event.request));
});

// Message handling for retrying failed requests
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'RETRY_FAILED_REQUESTS') {
    retryFailedRequests();
  }
});

// Retry failed requests when back online
async function retryFailedRequests() {
  if (failedRequests.size === 0) {
    return;
  }
  
  console.log(`Retrying ${failedRequests.size} failed requests`);
  
  // Create a copy to iterate through while potentially modifying the original
  const requestsToRetry = Array.from(failedRequests.entries());
  
  for (const [key, request] of requestsToRetry) {
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        console.log('Successfully retried:', key);
        failedRequests.delete(key);
        
        // Update cache with new response
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response);
      }
    } catch (error) {
      console.log('Retry still failed for:', key);
    }
  }
}

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

// Track app installation status
self.addEventListener('appinstalled', (event) => {
  console.log('App was installed', event);
});

console.log('Service Worker: Registered');
