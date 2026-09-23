/**
 * Pending-action resume across authentication — the Spotify/Google pattern.
 *
 * Problem it solves: a logged-out user starts something (booking, checkout,
 * a chat message), hits an auth wall, signs in… and the action is gone,
 * replaced by a "please sign in" toast. Instead we:
 *
 *   1. savePendingAction() — stash the intent (route + payload) in
 *      sessionStorage and send the user to /auth?redirect=<returnTo>.
 *   2. After login Auth navigates to `returnTo`.
 *   3. The destination surface peek/takePendingAction()s and resumes:
 *      - bookings reopen with selections intact (nothing created until confirm)
 *      - checkouts restore their state but NEVER auto-charge — the user
 *        always taps pay again explicitly
 *      - chat drafts are restored as text (persisted separately per thread)
 *
 * Session storage (not local): intents die with the tab, so a stale intent
 * can never fire days later. Each intent also carries createdAt and expires
 * after 30 minutes. takePendingAction() single-consumes.
 */

export type PendingAction =
  | {
      kind: 'booking';
      providerId: string;
      visitType: 'new' | 'returning';
      appointmentType: 'physical' | 'virtual';
      /** yyyy-MM-dd */
      date: string | null;
      time: string | null;
      reason: string;
      returnTo: string;
      createdAt: number;
    }
  | {
      kind: 'video-booking';
      providerId: string | null;
      consultationTypeId: string | null;
      date: string | null;
      time: string | null;
      notes: string;
      returnTo: string;
      createdAt: number;
    }
  | {
      kind: 'waitlist';
      providerId: string;
      urgency: string;
      selectedDays: string[];
      selectedTimes: string[];
      notes: string;
      returnTo: string;
      createdAt: number;
    }
  | {
      kind: 'checkout';
      /** Route whose checkout UI should be restored (user re-confirms payment). */
      returnTo: string;
      label: string;
      createdAt: number;
    }
  | {
      kind: 'return';
      returnTo: string;
      createdAt: number;
    };

const STORAGE_KEY = 'doc_pending_action';
const TTL_MS = 30 * 60 * 1000;

function isFresh(a: { createdAt: number }): boolean {
  return Date.now() - a.createdAt < TTL_MS;
}

export function savePendingAction(action: PendingAction): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  } catch {
    // Storage unavailable (private mode) — the return-to redirect still works.
  }
}

/** Read without consuming. */
export function peekPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAction;
    if (!parsed || typeof parsed !== 'object' || !isFresh(parsed as { createdAt: number })) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Read once and clear — each intent resumes at most one time. */
export function takePendingAction(): PendingAction | null {
  const action = peekPendingAction();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return action;
}

export function clearPendingAction(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Safe same-app redirect target. Rejects protocol-relative URLs (`//evil`),
 * schemes (`javascript:`, `http:`) and anything not rooted at `/`.
 */
export function safeRedirectTarget(raw: string | null, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return fallback;
  return raw;
}

/** `/auth?redirect=<encoded current path + search>` for auth walls. */
export function authRedirectUrl(returnTo: string): string {
  return `/auth?redirect=${encodeURIComponent(returnTo)}`;
}

/** Current location as a return-to string (path + query). */
export function currentReturnTo(): string {
  if (typeof window === 'undefined') return '/dashboard';
  return `${window.location.pathname}${window.location.search}`;
}
