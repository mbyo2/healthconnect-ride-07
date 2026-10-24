// HealthConnect Service Worker
// Provides offline functionality, caching, and background sync

// NOTE (2026-09-26): the app shell ('/') must NEVER be precached or served
// cache-first. Every deployment replaces the hashed JS bundles, so a cached
// '/' HTML references pruned bundles and the app can never boot again until
// the service worker updates. Navigation requests already use network-first
// (handleNavigationRequest) — keep it that way.
const CACHE_NAME = 'healthconnect-v1.3.0';
const STATIC_CACHE = 'healthconnect-static-v4';
const DYNAMIC_CACHE = 'healthconnect-dynamic-v4';
// Per-user API caches (P2-31): every authenticated Supabase API response is
// stored ONLY in a cache named after the user id decoded from the request's
// Authorization Bearer JWT (`sub` claim, decode-only — a cache partition
// key, never an auth decision): `healthconnect-api-<sub>`. There is no
// shared API cache anymore: a response is only ever read back from the
// cache of the same `sub`, so a shared clinic tablet can never serve one
// user's cached patient data to a different user/session. Requests without
// a decodable user token are never cached at all (network-only).
const API_CACHE_PREFIX = 'healthconnect-api-';
// Pre-P2-31 shared API caches: one cache served every user on the device.
// Deleted unconditionally on activate so no cross-user data survives.
const LEGACY_API_CACHES = ['healthconnect-api-v5'];
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

// (Removed: the pre-P2-31 OFFLINE_CACHEABLE_TABLES anonymous allowlist.
// Anonymous/undifferentiated API responses are never cached now — see the
// API_CACHE_PREFIX note above. Signed-in users still get offline reads of
// every table they can access, from their own per-user cache partition.)

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
            // Legacy shared API caches go first — unconditionally.
            if (LEGACY_API_CACHES.includes(cacheName)) {
              console.log('[SW] Deleting legacy shared API cache:', cacheName);
              return caches.delete(cacheName);
            }
            // Per-user API caches survive activation: rural clinics stay
            // offline for weeks and the SW may update in between. Isolation
            // comes from the per-`sub` naming, not from wiping; sign-out
            // (CLEAR_API_CACHE) is the wipe point.
            const isPerUserApiCache = cacheName.startsWith(API_CACHE_PREFIX);
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                !isPerUserApiCache &&
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

  // Supabase API traffic is routed before everything else.
  if (isSupabaseRequest(request)) {
    // /auth/v1/ is NEVER intercepted: tokens must not sit in Cache Storage
    // and auth responses must never be synthesised or replayed by the
    // worker. Leaving the request untouched = network-only.
    if (isAuthRequest(request)) {
      return;
    }
    // No decodable user token -> no caching of any kind (network-only).
    // This covers signed-out traffic: the anon key JWT has no `sub`.
    if (!userIdFromRequest(request)) {
      return;
    }
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle different types of requests
  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
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
    cache.put(request, networkResponse.clone()).then(() => trimCache(BUNDLE_CACHE, 200));
  }
  return networkResponse;
}

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/);
}

// Check if request targets the Supabase project host's API surface
// (REST, auth, storage, edge functions).
function isSupabaseRequest(request) {
  const url = new URL(request.url);
  const isProjectHost = url.hostname === 'supabase.co' || url.hostname.endsWith('.supabase.co');
  if (!isProjectHost) return false;
  return url.pathname.startsWith('/rest/v1/') ||
         url.pathname.startsWith('/auth/v1/') ||
         url.pathname.startsWith('/storage/v1/') ||
         url.pathname.startsWith('/functions/v1/');
}

// Auth endpoints specifically: network-only, never cached (see fetch router).
function isAuthRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/auth/v1/');
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

// Handle Supabase API requests with a network-first strategy (P2-31).
//
// Isolation contract:
// - The ONLY cache an API response is written to — or read back from — is
//   `healthconnect-api-<sub>` for the `sub` decoded from THIS request's
//   Authorization Bearer JWT. One user's data can therefore never be
//   served to another user/session on a shared device.
// - Requests with no token, an undecodable token, or a token without a
//   `sub` (e.g. the anon key) never reach this handler: the fetch router
//   leaves them untouched (network-only, nothing cached).
// - /auth/v1/ never reaches this handler either (network-only — tokens
//   must not sit in Cache Storage).
// - Only GETs reach this handler (the router returns early for non-GET).
// The token itself is never stored — only the decoded user id, as the
// cache name. All per-user API caches are wiped on sign-out
// (CLEAR_API_CACHE) and the legacy shared cache is deleted on activate.
// Keep runtime caches bounded over long offline periods: oldest entries
// are evicted first (Cache API keys() preserves insertion order).
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
    }
  } catch (e) { /* best-effort */ }
}

// Decode-only JWT `sub` extraction. NO signature verification: the value
// is a cache partition key, never an auth decision — the server still
// enforces auth/RLS on every network request, and a forged token can at
// worst partition the forger's own (server-rejected) traffic.
function userIdFromRequest(request) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const parts = auth.slice(7).split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const sub = payload.sub;
    // Cache names must stay plain: Supabase user ids are UUIDs. Anything
    // else is treated as "no user" (network-only) rather than trusted as
    // a cache name.
    if (typeof sub !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sub)) return null;
    return sub;
  } catch (e) {
    return null;
  }
}

function apiCacheNameFor(sub) {
  return API_CACHE_PREFIX + sub;
}

function apiCacheKey(request) {
  const url = new URL(request.url);
  // No user marker in the key: the cache itself is the per-user partition.
  // PostgREST returns an object vs an array for the same URL depending on
  // the Accept header (.single() vs list) — keep those entries separate.
  const accept = request.headers.get('Accept') || '';
  if (accept.includes('vnd.pgrst.object')) {
    url.searchParams.set('__sb_single', '1');
  }
  return url.toString();
}

// Delete every per-user API cache (plus any legacy shared API cache).
// Used on sign-out: cache names are dynamic, so wipe by prefix.
async function clearApiCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith(API_CACHE_PREFIX) || LEGACY_API_CACHES.includes(name))
      .map((name) => caches.delete(name))
  );
}

async function handleAPIRequest(request) {
  const sub = userIdFromRequest(request);
  // Defensive: the router already guarantees a decodable `sub`; if that
  // ever fails here, fall back to plain network — never a shared cache.
  if (!sub) {
    return fetch(request);
  }
  const cacheName = apiCacheNameFor(sub);
  const cache = await caches.open(cacheName);
  const cacheKey = apiCacheKey(request);

  const serveFromCache = async () => {
    const cachedResponse = await cache.match(cacheKey);
    if (!cachedResponse) return null;
    const body = await cachedResponse.clone().arrayBuffer();
    const headers = new Headers(cachedResponse.headers);
    headers.set('X-Served-From', 'cache');
    return new Response(body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers
    });
  };

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(cacheKey, networkResponse.clone()).then(() => trimCache(cacheName, 400));
      return networkResponse;
    }

    // The server actively rejected this session: never mask a 401/403 by
    // serving cached data (the session may be revoked or expired).
    if (networkResponse.status === 401 || networkResponse.status === 403) {
      return networkResponse;
    }

    // Other server errors: fall back to this user's cached copy if any.
    const cachedResponse = await serveFromCache();
    if (cachedResponse) return cachedResponse;

    return networkResponse;
  } catch (error) {
    // Offline: serve this user's cached copy
    const cachedResponse = await serveFromCache();
    if (cachedResponse) return cachedResponse;

    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable',
      offline: true,
      message: 'Please check your internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
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
        // Sign-out hygiene: drop ALL per-user API caches with the session.
        // Cache names are dynamic (`healthconnect-api-<sub>`), so wipe by
        // prefix — deleting one fixed name would leave other users' cached
        // data on a shared device.
        clearApiCaches().then(() => {
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
