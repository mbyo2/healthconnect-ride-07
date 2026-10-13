// Only allow payment return/cancel redirects back to the app's own origins.
const ALLOWED_HOSTS = [
  'doc0clock.online',
  'www.doc0clock.online',
  'healthconnect-ride-07.lovable.app',
  'localhost',
];
const ALLOWED_SUFFIXES = ['.lovable.app', '.lovableproject.com'];

export function safeRedirectUrl(raw: string | undefined | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') return fallback;
    const h = u.hostname.toLowerCase();
    if (ALLOWED_HOSTS.includes(h) || ALLOWED_SUFFIXES.some((s) => h.endsWith(s))) {
      return `${u.origin}${u.pathname}`;
    }
  } catch { /* invalid */ }
  return fallback;
}
