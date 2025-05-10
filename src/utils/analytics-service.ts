
/**
 * Analytics service for tracking user behavior and feature usage
 */

// Types for analytics events
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
}

// In-memory event queue for offline support
const eventQueue: AnalyticsEvent[] = [];
let isProcessingQueue = false;

// Configuration with sensible defaults
const config = {
  sampleRate: 1.0,  // Collect 100% of events by default
  batchSize: 10,    // Send events in batches of 10
  flushInterval: 30000, // Flush every 30 seconds
  debug: false      // Debug mode off by default
};

// Initialize the analytics service
export function initAnalytics(overrides = {}) {
  Object.assign(config, overrides);
  console.info('Analytics initialized with config:', config);
  
  // Set up flush interval
  setInterval(flushEvents, config.flushInterval);
  
  // Attach page visibility change event to flush on tab closure
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents(true);
    }
  });
  
  // Attach before unload event to flush before page closes
  window.addEventListener('beforeunload', () => {
    flushEvents(true);
  });
}

// Main event logging function
export function logAnalyticsEvent(event: string, properties = {}) {
  try {
    // Check if we should sample this event
    if (Math.random() > config.sampleRate) {
      if (config.debug) console.debug(`Analytics: Sampling skipped event ${event}`);
      return;
    }
    
    // Create event object
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: new Date().toISOString(),
    };
    
    // Add to queue
    eventQueue.push(analyticsEvent);
    if (config.debug) console.debug(`Analytics: Queued event ${event}`, properties);
    
    // Auto-flush if we've reached batch size
    if (eventQueue.length >= config.batchSize) {
      flushEvents();
    }
  } catch (error) {
    console.error('Error logging analytics event:', error);
  }
}

// Specific user identification
export function identifyUser(userId: string, traits = {}) {
  logAnalyticsEvent('identify', { userId, ...traits });
}

// Page view tracking
export function pageView(page: string, properties = {}) {
  logAnalyticsEvent('page_view', { page, ...properties });
}

// Feature usage tracking
export function trackFeatureUsage(feature: string, properties = {}) {
  logAnalyticsEvent('feature_used', { feature, ...properties });
}

// Flush events to backend
async function flushEvents(immediate = false) {
  // Don't do anything if queue is empty or already processing
  if (eventQueue.length === 0 || (isProcessingQueue && !immediate)) return;
  
  try {
    isProcessingQueue = true;
    const eventsToSend = [...eventQueue];
    eventQueue.length = 0; // Clear the queue
    
    // In a real implementation, send to backend
    // Here we're just logging to console in development
    if (config.debug) {
      console.debug(`Analytics: Flushing ${eventsToSend.length} events`, eventsToSend);
    }
    
    // In production this would be an API call
    // await fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ events: eventsToSend }),
    // });
  } catch (error) {
    console.error('Error flushing analytics events:', error);
    // Put events back in queue if there's an error
    eventQueue.unshift(...eventQueue);
  } finally {
    isProcessingQueue = false;
  }
}
