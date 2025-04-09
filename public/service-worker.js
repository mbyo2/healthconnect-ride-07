// Cache name with version for updates
const CACHE_NAME = 'doc-o-clock-cache-v1';

// Assets to cache for offline availability
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete outdated caches
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

// Fetch event - network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Supabase API calls and other external resources
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('data:') ||
      event.request.url.includes('blob:')) {
    return;
  }

  // Network first, falling back to cache strategy for most resources
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for the cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            // Only cache static assets (avoid bloating cache with dynamic content)
            if (!event.request.url.includes('?') && 
                !event.request.url.endsWith('.json')) {
              cache.put(event.request, responseToCache);
            }
          });

        return response;
      })
      .catch(() => {
        // When network fails, try cache
        return caches.match(event.request)
          .then(cachedResponse => {
            // If cached resource exists, return it
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // For HTML requests, show offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            
            // Otherwise fail
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from Doc\' O Clock',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Doc\' O Clock', options)
    );
  } catch (error) {
    // If data is not JSON
    const options = {
      body: event.data.text(),
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    };
    
    event.waitUntil(
      self.registration.showNotification('Doc\' O Clock', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then((clientList) => {
      const url = event.notification.data?.url || '/';
      
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle service worker offline/online status
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Background sync function
async function syncData() {
  // Read from IndexedDB and sync to server when online
  // Implementation depends on your app's requirements
  console.log('Performing background sync');
}
