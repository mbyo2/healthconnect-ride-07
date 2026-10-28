import { useEffect } from "react";
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
 * - The document scroller is <body>, not the window (html/body height CSS
 *   makes body the scroll container; window.scrollY stays 0), and the app
 *   shell (MobileLayout) scrolls inside <main id="main-content">. All of
 *   them are reset; resetting a non-scroller is a no-op.
 * - Hash anchors keep working: when the URL carries a #fragment and the
 *   target element exists, we scroll to it instead of the top.
 * - POP navigations (browser Back/Forward) are left to the browser's
 *   native scroll restoration so users return to where they were.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
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

    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [pathname, hash, navigationType]);

  return null;
}

export default ScrollToTop;
