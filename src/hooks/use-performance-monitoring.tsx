
import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  // Page load metrics
  loadStartTime: number | null;
  domContentLoadedTime: number | null;
  loadCompleteTime: number | null;
  firstPaintTime: number | null;
  firstContentfulPaintTime: number | null;
  largestContentfulPaintTime: number | null;
  
  // Interaction metrics
  firstInputDelayTime: number | null;
  cumulativeLayoutShiftScore: number | null;
  
  // Memory metrics
  jsHeapSizeLimit: number | null;
  totalJSHeapSize: number | null;
  usedJSHeapSize: number | null;
}

export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadStartTime: null,
    domContentLoadedTime: null,
    loadCompleteTime: null,
    firstPaintTime: null,
    firstContentfulPaintTime: null,
    largestContentfulPaintTime: null,
    firstInputDelayTime: null,
    cumulativeLayoutShiftScore: null,
    jsHeapSizeLimit: null,
    totalJSHeapSize: null,
    usedJSHeapSize: null,
  });
  
  const collectMetrics = useCallback(() => {
    if (!window.performance) return;
    
    // Navigation timing
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      setMetrics(prev => ({
        ...prev,
        loadStartTime: navigationTiming.fetchStart,
        domContentLoadedTime: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
        loadCompleteTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
      }));
    }
    
    // Paint timing
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    
    if (firstPaint) {
      setMetrics(prev => ({
        ...prev,
        firstPaintTime: firstPaint.startTime,
      }));
    }
    
    if (firstContentfulPaint) {
      setMetrics(prev => ({
        ...prev,
        firstContentfulPaintTime: firstContentfulPaint.startTime,
      }));
    }
    
    // Memory metrics (if available)
    if ((performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
      }));
    }
    
    // Report metrics to backend or analytics
    if (import.meta.env.PROD) {
      // In production, send metrics to analytics
      try {
        const { logAnalyticsEvent } = require('@/utils/analytics-service');
        logAnalyticsEvent('performance_metrics', {
          page: window.location.pathname,
          ...metrics,
        });
      } catch (e) {
        console.error('Failed to log performance metrics', e);
      }
    }
  }, [metrics]);
  
  useEffect(() => {
    // Initial collection after load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 1000); // Wait a bit for late metrics
    } else {
      window.addEventListener('load', () => setTimeout(collectMetrics, 1000));
    }
    
    // Set up observers for web vitals if available
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({
          ...prev,
          largestContentfulPaintTime: lastEntry.startTime,
        }));
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstInput = entries[0];
        if (firstInput) {
          setMetrics(prev => ({
            ...prev,
            firstInputDelayTime: firstInput.processingStart - firstInput.startTime,
          }));
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      
      // Cumulative Layout Shift
      let cumulativeLayoutShift = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cumulativeLayoutShift += (entry as any).value;
            setMetrics(prev => ({
              ...prev,
              cumulativeLayoutShiftScore: cumulativeLayoutShift,
            }));
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      // Cleanup
      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (e) {
      console.warn('Performance observer not supported', e);
    }
  }, [collectMetrics]);
  
  return { metrics, refreshMetrics: collectMetrics };
};
