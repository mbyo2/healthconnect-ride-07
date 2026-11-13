import { useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";

/**
 * useAnnounceOnChange — state-change announcements for screen reader
 * users (coverage fix, 2026-11-13).
 *
 * Announces a message derived from `value` whenever it changes to a
 * non-null value, skipping the first render (mount is the route
 * announcer's job, not this hook's). Pass null while the state is not
 * ready yet (e.g. still loading) — no announcement fires.
 *
 * Everything flows through AccessibilityContext.screenReaderAnnounce:
 * the message always reaches assistive tech via the aria-live region and
 * is SPOKEN aloud only when the user has explicitly turned screen reader
 * mode ON. Nothing here talks to the speech API directly.
 */
export function useAnnounceOnChange<T>(
  value: T | null | undefined,
  buildMessage: (value: NonNullable<T>) => string | null,
  assertive = false,
): void {
  const { screenReaderAnnounce } = useAccessibility();
  const announceRef = useRef(screenReaderAnnounce);
  announceRef.current = screenReaderAnnounce;
  const buildRef = useRef(buildMessage);
  buildRef.current = buildMessage;
  const isFirstRef = useRef(true);
  const prevRef = useRef<T | null | undefined>(undefined);

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      prevRef.current = value;
      return;
    }
    if (value === prevRef.current) return;
    prevRef.current = value;
    if (value === null || value === undefined) return;
    const message = buildRef.current(value as NonNullable<T>);
    if (message) announceRef.current(message, assertive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, assertive]);
}

export default useAnnounceOnChange;
