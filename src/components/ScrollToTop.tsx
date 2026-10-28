import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * ScrollToTop — router-level scroll restoration.
 *
 * Every fresh in-app navigation (PUSH / REPLACE) must land at the top of
 * the new page. Before this component existed, nothing reset scroll on
 * route change, so following a footer/nav link from a scrolled page left
 * the user part-way down the next page (proven live 2026-10-28:
 * /terms scrolled → footer /privacy landed at body scrollTop 1866).
 *
 * Details that matter for this app:
 * - The document scroller is <body>, not the window (index.css sets
 *   html,body { height: 100% }, which makes body the scroll container;
 *   window.scrollY stays 0), and the app shell (MobileLayout) also
 *   scrolls inside <main id="main-content">. All of them are reset;
 *   resetting a non-scroller is a no-op.
 * - index.css sets `scroll-behavior: smooth` on html/body, so a plain
 *   scrollTop assignment ANIMATES — and a route change immediately
 *   followed by lazy-chunk/data renders can strand that animation
 *   mid-flight (proven live: /providers → /search stayed at 1416 with a
 *   naive reset). Resets therefore use behavior:"instant" and run again
 *   on the next animation frame.
 * - Hash anchors keep working: when the URL carries a #fragment and the
 *   target element exists, we scroll to it instead of the top.
 * - POP navigations (browser Back/Forward) are left to the browser's
 *   native scroll restoration so users return to where they were.
 */
export function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      let id = hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        /* keep the raw fragment */
      }
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    const resetScroll = () => {
      const opts: ScrollToOptions = { top: 0, left: 0, behavior: "instant" };
      window.scrollTo(opts);
      if (document.documentElement) {
        document.documentElement.scrollTo(opts);
        if (document.documentElement.scrollTop !== 0) {
          document.documentElement.scrollTop = 0;
        }
      }
      if (document.body) {
        document.body.scrollTo(opts);
        if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
      }
      const main = document.querySelector("main");
      if (main) {
        main.scrollTo(opts);
        if (main.scrollTop !== 0) main.scrollTop = 0;
      }
    };

    resetScroll();
    const raf = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(raf);
    // `key` is in the deps on purpose: it changes on EVERY navigation,
    // including a nav-link click for the page you are already on
    // (same pathname) — those clicks must also land at the top.
  }, [pathname, hash, key, navigationType]);

  return null;
}

export default ScrollToTop;
