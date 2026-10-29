/**
 * Recovery for stale-shell chunk failures.
 *
 * Every deploy replaces the content-hashed JS bundles. A tab that has been
 * open across a deploy (an SPA session never re-fetches the shell) still
 * holds the OLD build's module map: navigating to a route it has not visited
 * yet makes it request the OLD build's chunk for that route. Once the old
 * deployment is gone (Vercel cleanup / retention), that request 404s, the
 * dynamic import rejects, and the route's error boundary is a dead end —
 * its "Try Again" re-runs the same doomed import.
 *
 * The cure is a single full-page reload: the browser fetches the current
 * shell and the current chunks and lands back on the same URL. The reload
 * is guarded by a sessionStorage timestamp so a genuinely broken build
 * (where even the fresh shell cannot load a chunk) can never spin a
 * reload loop — after one attempt inside the guard window, the error is
 * left to surface in the boundary, whose retry button does a user-driven
 * hard reload.
 */

const RELOAD_GUARD_KEY = 'dococlock.chunk_reload_at';
const RELOAD_GUARD_WINDOW_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module', // Chrome / Edge
  'error loading dynamically imported module', // Firefox
  'importing a module script failed', // Safari
  'chunkloaderror', // webpack-style name/message
  'loading chunk', // "Loading chunk N failed"
];

/** True when an error is a failed dynamic-import / chunk load (any browser). */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: unknown })?.name;
  if (typeof name === 'string' && name.toLowerCase() === 'chunkloaderror') {
    return true;
  }
  const message = (error as { message?: unknown })?.message;
  if (typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * If `error` is a chunk-load failure and no chunk reload has happened in
 * the last guard window, reload the page once to pick up the current
 * build and return true. Otherwise return false (caller surfaces the
 * error normally).
 */
export function reloadOnceForChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Number.isFinite(last) && now - last < RELOAD_GUARD_WINDOW_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    // Storage unavailable (private mode, disabled cookies): the loop
    // guard cannot be verified, so do NOT auto-reload — an automatic
    // reload must never be able to spin. The error surfaces in the
    // boundary instead, where the retry button performs a user-driven
    // hard reload for chunk errors.
    return false;
  }
  window.location.reload();
  return true;
}
