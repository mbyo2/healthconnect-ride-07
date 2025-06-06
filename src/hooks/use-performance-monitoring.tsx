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
  networkSpeed: 'slow' | 'medium' | 'fast' | 'unknown';
}

// Type augmentation for Performance to include non-standard memory property
interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
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
    routeChangePerformance: {},
    networkSpeed: 'unknown'
  });

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
    // Log significant metrics to analytics
    if (Object.keys(newMetrics).length > 0) {
      logAnalyticsEvent('performance_metrics_updated', newMetrics);
    }
  }, []);

  // Add network speed detection
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('connection' in navigator)) {
      return;
    }

    try {
      const connection = (navigator as any).connection;
      
      if (connection) {
        const getNetworkSpeed = () => {
          if (connection.effectiveType === '4g') {
            return 'fast';
          } else if (connection.effectiveType === '3g') {
            return 'medium';
          } else {
            return 'slow';
          }
        };
        
        updateMetrics({ networkSpeed: getNetworkSpeed() });
        
        const updateConnectionSpeed = () => {
          updateMetrics({ networkSpeed: getNetworkSpeed() });
        };
        
        connection.addEventListener('change', updateConnectionSpeed);
        
        return () => {
          connection.removeEventListener('change', updateConnectionSpeed);
        };
      }
    } catch (error) {
      console.warn('Network speed detection not supported', error);
    }
  }, [enabled, updateMetrics]);

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

  // Add optimized resource loading priority
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    try {
      // Detect slow connection and optimize resource loading
      if (metrics.networkSpeed === 'slow') {
        // Defer non-critical resources
        document.querySelectorAll('img:not([loading="eager"])').forEach((img: HTMLImageElement) => {
          img.loading = 'lazy';
        });
        
        // Reduce image quality for slow connections
        document.querySelectorAll('img[data-src-low]').forEach((img: HTMLImageElement) => {
          if (img.getAttribute('data-src-low')) {
            img.src = img.getAttribute('data-src-low') || img.src;
          }
        });
      }
    } catch (error) {
      console.warn('Resource optimization error:', error);
    }
  }, [enabled, metrics.networkSpeed]);

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

        // Memory usage if available (Chrome only)
        const perf = performance as PerformanceWithMemory;
        if (perf.memory) {
          updateMetrics({
            jsHeapSize: perf.memory.usedJSHeapSize
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

  // Add simple performance optimization recommendations
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 2000) {
      recommendations.push('Consider using preloading for critical resources to improve load time.');
    }
    
    if (metrics.jsHeapSize && metrics.jsHeapSize > 50000000) {
      recommendations.push('High memory usage detected. Consider optimizing JavaScript bundle size.');
    }
    
    if (metrics.networkSpeed === 'slow') {
      recommendations.push('User on slow connection. Consider serving lower-quality images and reducing API calls.');
    }
    
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('Layout shifts detected. Consider adding width and height attributes to images and other elements.');
    }
    
    return recommendations;
  }, [metrics]);

  return {
    metrics,
    recordRouteChange: useCallback((route: string) => {
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
    }, []),
    getPerformanceRecommendations
  };
};
