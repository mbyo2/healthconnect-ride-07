// HealthConnect Service Worker
// Provides offline functionality, caching, and background sync

const CACHE_NAME = 'healthconnect-v1.1.0';
const STATIC_CACHE = 'healthconnect-static-v2';
const DYNAMIC_CACHE = 'healthconnect-dynamic-v2';
const API_CACHE = 'healthconnect-api-v2';
const IMAGE_CACHE = 'healthconnect-images-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/d0c-icon.svg',
  '/logo192.png',
  '/logo512.png'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/user/profile',
  '/api/appointments',
  '/api/medications',
  '/api/providers'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/);
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('supabase.co');
}

// Check if request is navigation
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses for critical endpoints
      if (isCacheableAPI(request)) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator to response
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] API request failed:', error);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (isCriticalAPI(request)) {
      return new Response(JSON.stringify({
        error: 'Service temporarily unavailable',
        offline: true,
        message: 'Please check your internet connection'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Service unavailable', { status: 503 });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      return networkResponse;
    }
    
    // Serve offline page if network fails
    const offlinePage = await caches.match('/offline.html');
    return offlinePage || new Response('Offline', { status: 503 });
  } catch (error) {
    console.error('[SW] Navigation request failed:', error);
    const offlinePage = await caches.match('/offline.html');
    return offlinePage || new Response('Offline', { status: 503 });
  }
}

// Handle dynamic requests with cache-first strategy
async function handleDynamicRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Serve from cache and update in background
      fetch(request).then(response => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, response);
          });
        }
      }).catch(() => {
        // Ignore background update failures
      });
      
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Dynamic request failed:', error);
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Check if API endpoint should be cached
function isCacheableAPI(request) {
  const url = new URL(request.url);
  return CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
}

// Check if API endpoint is critical
function isCriticalAPI(request) {
  const url = new URL(request.url);
  const criticalEndpoints = [
    '/api/user/profile',
    '/api/appointments',
    '/api/emergency'
  ];
  return criticalEndpoints.some(endpoint => url.pathname.startsWith(endpoint));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-appointments') {
    event.waitUntil(syncAppointments());
  } else if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'background-sync-payments') {
    event.waitUntil(syncPayments());
  }
});

// Sync appointments when back online
async function syncAppointments() {
  try {
    console.log('[SW] Syncing appointments...');
    
    // Get pending appointments from IndexedDB
    const pendingAppointments = await getPendingData('appointments');
    
    for (const appointment of pendingAppointments) {
      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointment.data)
        });
        
        if (response.ok) {
          await removePendingData('appointments', appointment.id);
          console.log('[SW] Appointment synced successfully');
        }
      } catch (error) {
        console.error('[SW] Failed to sync appointment:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync messages when back online
async function syncMessages() {
  try {
    console.log('[SW] Syncing messages...');
    
    const pendingMessages = await getPendingData('messages');
    
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.data)
        });
        
        if (response.ok) {
          await removePendingData('messages', message.id);
          console.log('[SW] Message synced successfully');
        }
      } catch (error) {
        console.error('[SW] Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Message sync failed:', error);
  }
}

// Sync payments when back online
async function syncPayments() {
  try {
    console.log('[SW] Syncing payments...');
    
    const pendingPayments = await getPendingData('payments');
    
    for (const payment of pendingPayments) {
      try {
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payment.data)
        });
        
        if (response.ok) {
          await removePendingData('payments', payment.id);
          console.log('[SW] Payment synced successfully');
        }
      } catch (error) {
        console.error('[SW] Failed to sync payment:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Payment sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData = { title: 'HealthConnect', body: event.data.text() };
    }
  }
  
  const options = {
    title: notificationData.title || 'HealthConnect',
    body: notificationData.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: notificationData.tag || 'general',
    data: notificationData.data || {},
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/logo192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Handle different notification actions
  let url = '/';
  
  if (event.notification.data) {
    const data = event.notification.data;
    
    switch (data.type) {
      case 'appointment':
        url = '/appointments';
        break;
      case 'message':
        url = '/messages';
        break;
      case 'payment':
        url = '/payments';
        break;
      case 'security':
        url = '/security';
        break;
      default:
        url = data.url || '/';
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Utility functions for IndexedDB operations
async function getPendingData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HealthConnectOffline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function removePendingData(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HealthConnectOffline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
    }
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

console.log('[SW] Service worker loaded successfully');
