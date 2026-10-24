import { safeLocalRemove, safeSessionGet, safeSessionSet, safeSessionRemove } from './storage';

/**
 * P2-32: the signed-in user's profile used to be persisted in full
 * (every column of `profiles` — email, phone, date of birth, address,
 * and any clinical extensions) into localStorage, where it survived
 * browser restarts on shared clinic devices and was readable by any
 * script running on the origin.
 *
 * What the UI actually needs from a *cached* profile is only enough to
 * paint the first frame (name + avatar) while the fresh profile is
 * fetched from the server. Everything else lives in memory only and is
 * refetched on every load. The minimal subset is kept in
 * sessionStorage: it survives in-tab reloads (the instant-UI purpose)
 * but is gone when the tab/browser session ends.
 *
 * The role is deliberately NOT cached: authorization always comes from
 * the server (`get_user_role` RPC in AuthContext.fetchProfile).
 */

export const PROFILE_CACHE_KEY = 'doc_oclock_profile';

/** Fields the first paint needs. Anything not listed here is never persisted. */
const CACHED_PROFILE_FIELDS = ['id', 'first_name', 'last_name', 'avatar_url'] as const;

export type CachedProfile = Partial<Record<(typeof CACHED_PROFILE_FIELDS)[number], unknown>>;

/** Reduce a full profile row to the minimal display subset. */
export function toCachedProfile(profile: Record<string, unknown> | null | undefined): CachedProfile | null {
  if (!profile) return null;
  const out: Record<string, unknown> = {};
  for (const field of CACHED_PROFILE_FIELDS) {
    if (profile[field] !== undefined) out[field] = profile[field];
  }
  return out;
}

/** Persist the minimal display subset (sessionStorage only). */
export function cacheProfile(profile: Record<string, unknown> | null | undefined): void {
  const minimal = toCachedProfile(profile);
  if (!minimal || !minimal.id) {
    safeSessionRemove(PROFILE_CACHE_KEY);
    return;
  }
  safeSessionSet(PROFILE_CACHE_KEY, JSON.stringify(minimal));
}

/**
 * Read the cached display subset. Also purges the legacy localStorage
 * copy written by pre-P2-32 versions so full profiles do not linger on
 * shared devices after the app updates.
 */
export function readCachedProfile<T extends Record<string, unknown> = Record<string, unknown>>(): T | null {
  safeLocalRemove(PROFILE_CACHE_KEY);
  const raw = safeSessionGet(PROFILE_CACHE_KEY);
  if (!raw) return null;
  try {
    const clean = raw.trim().replace(/^\uFEFF/, '');
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    // Defence in depth: even a hand-edited cache is re-whitelisted on read.
    return toCachedProfile(parsed) as T | null;
  } catch {
    safeSessionRemove(PROFILE_CACHE_KEY);
    return null;
  }
}

/** Drop every persisted copy of the profile (sign-out). */
export function clearCachedProfile(): void {
  safeSessionRemove(PROFILE_CACHE_KEY);
  safeLocalRemove(PROFILE_CACHE_KEY);
}
