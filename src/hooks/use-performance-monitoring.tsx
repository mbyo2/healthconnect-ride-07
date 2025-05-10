
import { useState, useEffect, useCallback } from 'react';
import { logAnalyticsEvent } from '@/utils/analytics-service';
import { logError } from '@/utils/error-logging-service';

interface PerformanceMetrics {
  firstPaint: number | null;
  firstContentfulPaint: number | null;
  domInteractive: number | null;
  domComplete: number | null;
  largestContentfulPaint: number | null;
  firstInputDelay: number | null;
  cumulativeLayoutShift: number | null;
  navigationStart: number | null;
  resourceLoadTimes: Record<string, number>;
  jsHeapSize: number | null;
  routeChangePerformance: {
    [route: string]: {
      loadTime: number;
      renderTime: number;
      timestamp: string;
    };
  };
}

export const usePerformanceMonitoring = (enabled = true) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    firstPaint: null,
    firstContentfulPaint: null,
    domInteractive: null,
    domComplete: null,
    largestContentfulPaint: null,
    firstInputDelay: null,
    cumulativeLayoutShift: null,
    navigationStart: null,
    resourceLoadTimes: {},
    jsHeapSize: null,
    routeChangePerformance: {}
  });

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
    // Log significant metrics to analytics
    if (Object.keys(newMetrics).length > 0) {
      logAnalyticsEvent('performance_metrics_updated', newMetrics);
    }
  }, []);

  // Measure LCP (Largest Contentful Paint)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        updateMetrics({
          largestContentfulPaint: lastEntry?.startTime || null
        });
      });

      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      return () => lcpObserver.disconnect();
    } catch (error) {
      console.warn('LCP measurement not supported', error);
    }
  }, [enabled, updateMetrics]);

  // Measure FID (First Input Delay)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          // Only for FID we get processingStart
          const firstInputEntry = firstInput as any;
          const delay = firstInputEntry.processingStart - firstInputEntry.startTime;
          updateMetrics({
            firstInputDelay: delay
          });
        }
      });

      fidObserver.observe({ type: 'first-input', buffered: true });

      return () => fidObserver.disconnect();
    } catch (error) {
      console.warn('FID measurement not supported', error);
    }
  }, [enabled, updateMetrics]);

  // Measure CLS (Cumulative Layout Shift)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      let clsValue = 0;
      let clsEntries: PerformanceEntry[] = [];

      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          // Cast to any to access layout shift properties
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
            clsEntries.push(layoutShiftEntry);
          }
        });
        
        updateMetrics({
          cumulativeLayoutShift: clsValue
        });
      });

      clsObserver.observe({ type: 'layout-shift', buffered: true });

      return () => clsObserver.disconnect();
    } catch (error) {
      console.warn('CLS measurement not supported', error);
    }
  }, [enabled, updateMetrics]);

  // Collect basic navigation timing metrics
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.performance) {
      return;
    }

    try {
      const collectNavigationTiming = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          updateMetrics({
            navigationStart: navigation.startTime,
            domInteractive: navigation.domInteractive,
            domComplete: navigation.domComplete
          });
        }

        // Paint timing
        const paintMetrics = performance.getEntriesByType('paint');
        paintMetrics.forEach(entry => {
          if (entry.name === 'first-paint') {
            updateMetrics({ firstPaint: entry.startTime });
          } else if (entry.name === 'first-contentful-paint') {
            updateMetrics({ firstContentfulPaint: entry.startTime });
          }
        });

        // Resource timing
        const resources = performance.getEntriesByType('resource');
        const resourceTimes: Record<string, number> = {};
        resources.forEach(entry => {
          const url = entry.name.split('/').pop() || entry.name;
          resourceTimes[url] = entry.duration;
        });
        updateMetrics({ resourceLoadTimes: resourceTimes });

        // Memory usage if available
        if (performance.memory) {
          updateMetrics({
            jsHeapSize: (performance as any).memory.usedJSHeapSize
          });
        }
      };

      // Initial collection
      if (document.readyState === 'complete') {
        collectNavigationTiming();
      } else {
        window.addEventListener('load', collectNavigationTiming);
        return () => window.removeEventListener('load', collectNavigationTiming);
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to collect performance metrics'));
      console.warn('Performance measurement error', error);
    }
  }, [enabled, updateMetrics]);

  // Track route changes performance
  const recordRouteChange = useCallback((route: string) => {
    const startTime = performance.now();
    
    // Record when route render completes (on next frame)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const renderTime = performance.now() - startTime;
        
        setMetrics(prev => ({
          ...prev,
          routeChangePerformance: {
            ...prev.routeChangePerformance,
            [route]: {
              loadTime: startTime,
              renderTime: renderTime,
              timestamp: new Date().toISOString()
            }
          }
        }));
        
        logAnalyticsEvent('route_performance', {
          route,
          renderTime,
          timestamp: new Date().toISOString()
        });
      });
    });
  }, []);

  return {
    metrics,
    recordRouteChange
  };
};
