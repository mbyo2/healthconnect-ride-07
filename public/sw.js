// HealthConnect Service Worker
// Provides offline functionality, caching, and background sync

// NOTE (2026-09-26): the app shell ('/') must NEVER be precached or served
// cache-first. Every deployment replaces the hashed JS bundles, so a cached
// '/' HTML references pruned bundles and the app can never boot again until
// the service worker updates. Navigation requests already use network-first
// (handleNavigationRequest) — keep it that way.
const CACHE_NAME = 'healthconnect-v1.2.0';
const STATIC_CACHE = 'healthconnect-static-v4';
const DYNAMIC_CACHE = 'healthconnect-dynamic-v4';
const API_CACHE = 'healthconnect-api-v4';
const IMAGE_CACHE = 'healthconnect-images-v1';
// Runtime-only caches (never precached at install):
// - SHELL: the last successfully fetched '/' HTML, so an offline reload can
//   boot the app. Paired with BUNDLE below, the HTML and its hashed assets
//   always come from the same session, so they can never mismatch.
// - BUNDLE: hashed /assets/* files. Content-hashed names are immutable, so
//   cache-first is safe; a new deploy references new hashes.
const SHELL_CACHE = 'healthconnect-shell-v4';
const BUNDLE_CACHE = 'healthconnect-bundles-v4';

// Resources to cache immediately
// (deliberately excludes '/' — see note above)
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/d0c-icon.svg',
  '/logo192.png',
  '/logo512.png'
];

// Supabase REST tables whose GET responses may be cached for offline use.
// Directory-class, non-patient data ONLY (facility directory, help articles,
// lab catalog, taxonomy). Patient data is never cached by the worker —
// privacy rule. The app clears API_CACHE on sign-out (CLEAR_API_CACHE).
const OFFLINE_CACHEABLE_TABLES = [
  'healthcare_institutions',
  'kb_articles',
  'lab_test_catalog',
  'institution_types',
  'provider_types',
];

// Install event - cache static assets
// skipWaiting() runs unconditionally: a failed precache must never strand the
// new worker in "waiting" while an older worker keeps serving stale content.
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
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
      .then(() => self.skipWaiting())
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
                cacheName !== API_CACHE &&
                cacheName !== SHELL_CACHE &&
                cacheName !== BUNDLE_CACHE) {
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

  // Hashed build bundles: cache-first (immutable content hashes). This is
  // what lets a cached shell actually boot offline — the pair stays in sync.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(handleBundleAsset(request));
    return;
  }

  // Handle different types of requests
  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Cache-first for content-hashed build assets
async function handleBundleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(BUNDLE_CACHE);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/);
}

// Check if request is for API — Supabase REST only. Auth and storage
// traffic is never intercepted: credentials and private files must not be
// cached or synthesised by the worker.
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.hostname.includes('supabase.co') && url.pathname.startsWith('/rest/v1/');
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
      // Add offline indicator to response without mutating headers
      const body = await cachedResponse.clone().arrayBuffer();
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-From', 'cache');
      return new Response(body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] API request failed:', error);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a structured offline response for cacheable directory reads
    if (isCacheableAPI(request)) {
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

// Handle navigation requests — network-first; the last good HTML is kept
// in SHELL_CACHE so an offline reload can still boot the app shell.
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/', networkResponse.clone());
      return networkResponse;
    }
    throw new Error(`Navigation failed: ${networkResponse.status}`);
  } catch (error) {
    const shellCache = await caches.open(SHELL_CACHE);
    const cachedShell = await shellCache.match('/');
    if (cachedShell) {
      return cachedShell;
    }
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

// Check if a Supabase REST GET may be cached: directory-class tables only
function isCacheableAPI(request) {
  const url = new URL(request.url);
  const table = url.pathname.replace('/rest/v1/', '').split('/')[0];
  return OFFLINE_CACHEABLE_TABLES.includes(table);
}

// Offline write queueing lives in the app (useOfflineSync hook):
// allowlisted tables/fields are queued in IndexedDB and replayed through
// the real Supabase client on reconnect. The worker deliberately does NOT
// replay writes — it cannot hold the user's session safely.

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
      case 'CLEAR_API_CACHE':
        // Sign-out hygiene: drop cached directory reads with the session.
        caches.delete(API_CACHE).then(() => {
          if (event.ports[0]) event.ports[0].postMessage({ success: true });
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
