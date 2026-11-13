import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAccessibility } from "@/context/AccessibilityContext";
import { ROUTE_TITLES } from "@/components/PageTitleManager";

/**
 * RouteAnnouncer — shell-level page-load / navigation announcements
 * (screen-reader coverage fix, 2026-11-13).
 *
 * Before this, screenReaderAnnounce had exactly one consumer outside the
 * context and no page ever announced on load or navigation, so a screen
 * reader user heard nothing when a new page landed. This component sits
 * next to PageTitleManager in the app shell and announces the page title
 * on every navigation (including the first load).
 *
 * The announcement goes through AccessibilityContext.screenReaderAnnounce
 * ONLY: it always reaches assistive tech via the aria-live region, and is
 * SPOKEN aloud only when the user has explicitly turned screen reader
 * mode ON. Nothing here talks to the speech API directly.
 *
 * Title source: document.title first (PageTitleManager / Helmet have
 * already set it — this effect runs after theirs, and the short delay
 * covers lazy-chunk pages whose Helmet lands a beat later), falling back
 * to the PageTitleManager route map, then skipping the announcement
 * entirely rather than reading out a brand string.
 */
const ANNOUNCE_DELAY_MS = 350;

const cleanTitle = (raw: string): string | null => {
  const title = raw
    .replace(/\s*\|\s*Doc' O Clock\s*$/i, "")
    .replace(/\s*[—–-]\s*Doc' O Clock\s*$/i, "")
    .trim();
  if (!title || title === "Doc' O Clock" || title === "Doc' O Clock — Healthcare in Zambia") {
    return null;
  }
  return title;
};

const titleForPath = (path: string): string | null => {
  const exact = ROUTE_TITLES[path];
  if (exact) return cleanTitle(exact);
  const sortedPaths = Object.keys(ROUTE_TITLES).sort((a, b) => b.length - a.length);
  for (const routePath of sortedPaths) {
    if (routePath !== "/" && path.startsWith(routePath)) {
      return cleanTitle(ROUTE_TITLES[routePath]);
    }
  }
  return null;
};

export const RouteAnnouncer = () => {
  const { pathname, key } = useLocation();
  const { screenReaderAnnounce } = useAccessibility();
  const announceRef = useRef(screenReaderAnnounce);
  announceRef.current = screenReaderAnnounce;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const title = cleanTitle(document.title) ?? titleForPath(pathname);
      if (title) announceRef.current(title, false);
    }, ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
    // `key` changes on EVERY navigation, including a nav-link click for
    // the page you are already on — those re-announce too, like
    // ScrollToTop's scroll reset.
  }, [pathname, key]);

  return null;
};

export default RouteAnnouncer;
