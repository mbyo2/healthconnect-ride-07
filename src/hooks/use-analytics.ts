import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Lightweight analytics hook.
 * Tracks page views and custom events without external dependencies.
 * Events are stored in-memory and flushed to Supabase edge function in batches.
 * 
 * Replace the flush endpoint with your preferred analytics provider
 * (e.g., Plausible, PostHog, Umami) if desired.
 */

interface AnalyticsEvent {
  event: string;
  path?: string;
  props?: Record<string, string | number | boolean>;
  timestamp: number;
}

const eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 10_000; // 10 seconds
const MAX_QUEUE_SIZE = 20;

function enqueueEvent(event: AnalyticsEvent) {
  eventQueue.push(event);
  
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
  }
}

async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, eventQueue.length);

  try {
    // Log to console in dev mode for debugging
    if (import.meta.env.DEV) {
      console.log('[Analytics]', batch);
    }

    // In production, you could send to a Supabase edge function or external service:
    // await supabase.functions.invoke('track-analytics', { body: { events: batch } });
    
    // For now, store in sessionStorage for the session
    const existing = JSON.parse(sessionStorage.getItem('doc_analytics') || '[]');
    sessionStorage.setItem('doc_analytics', JSON.stringify([...existing, ...batch].slice(-100)));
  } catch (error) {
    // Re-enqueue on failure (don't lose events)
    eventQueue.unshift(...batch);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEvents);
}

/**
 * Track custom events throughout the app
 */
export function trackEvent(event: string, props?: Record<string, string | number | boolean>) {
  enqueueEvent({
    event,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    props,
    timestamp: Date.now(),
  });
}

/**
 * Hook that auto-tracks page views on route changes
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    trackEvent('pageview', {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer || 'direct',
    });
  }, [location.pathname, location.search]);
}

/**
 * Hook to track specific user interactions
 */
export function useTrackEvent() {
  return useCallback((event: string, props?: Record<string, string | number | boolean>) => {
    trackEvent(event, props);
  }, []);
}
