/**
 * P2-33: chat attachment `file_url` is stored data written by the *other*
 * chat participant's client. Rendering it as an <a href> without an
 * allowlist is a stored phishing / `javascript:` vector between users.
 *
 * A stored value may render as a link ONLY when it parses as a URL with
 * an `https:` scheme (Supabase signed/public storage URLs are https).
 * Everything else — `javascript:`, `data:`, `http:`, protocol-relative,
 * whitespace/control-prefixed tricks, plain storage paths — returns
 * null and the caller renders the file name as plain text instead.
 */
export function safeHttpsUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Browsers strip leading C0 controls/space and embedded TAB/LF/CR when
  // parsing URLs, which is how " javascript:..." or "java\tscript:..."
  // smuggle a scheme past naive prefix checks. Remove them up front so
  // the value we validate is the value the browser would navigate to.
  const cleaned = raw.replace(/[\u0000-\u0020\u007F]/g, '');
  if (!cleaned) return null;
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return null; // not an absolute URL (e.g. a storage path) — not a link
  }
  if (url.protocol !== 'https:') return null;
  // Credentials in the URL (https://user@host) are a phishing staple and
  // never legitimate for a stored attachment link.
  if (url.username || url.password) return null;
  return url.toString();
}
