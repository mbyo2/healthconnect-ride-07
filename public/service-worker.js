// LEGACY service worker — intentionally retired (2026-09-26).
//
// This file used to be the registered worker ('/service-worker.js'). It has
// been superseded by '/sw.js'. Any browser that still has this worker
// registered will pick up THIS version on its next update check (the script
// is served with no-store). On activate it wipes every cache it owns,
// unregisters itself, and reloads its controlled pages once so the app can
// boot fresh and register the current '/sw.js'.
//
// Do NOT add caching logic here. Do NOT re-register this script from app code.

self.addEventListener('install', (event) => {
  // Take over immediately so the cleanup below actually runs.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Delete every cache this (or any older) worker created.
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (e) {
        // Best effort; continue with unregistration regardless.
      }

      try {
        // 2. Unregister this legacy worker.
        await self.registration.unregister();
      } catch (e) {
        // Best effort.
      }

      try {
        // 3. Reload controlled pages once so they boot without a stale worker.
        // The app registers '/sw.js' on boot.
        const controlled = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        await Promise.all(
          controlled.map((client) => {
            try {
              return client.navigate(client.url);
            } catch (e) {
              return Promise.resolve();
            }
          })
        );
      } catch (e) {
        // Best effort.
      }
    })()
  );
});

// No fetch handler: while this worker is briefly alive it must not serve
// anything from cache. Uncontrolled requests fall through to the network.
