import { useEffect, useCallback, useRef } from 'react';

// Performance monitoring hook
export const usePerformance = () => {
  const performanceRef = useRef<{
    marks: Map<string, number>;
    measures: Map<string, number>;
  }>({
    marks: new Map(),
    measures: new Map(),
  });

  const mark = useCallback((name: string) => {
    const timestamp = performance.now();
    performanceRef.current.marks.set(name, timestamp);
    
    if (performance.mark) {
      performance.mark(name);
    }
  }, []);

  const measure = useCallback((name: string, startMark: string, endMark?: string) => {
    const startTime = performanceRef.current.marks.get(startMark);
    const endTime = endMark 
      ? performanceRef.current.marks.get(endMark)
      : performance.now();

    if (startTime && endTime) {
      const duration = endTime - startTime;
      performanceRef.current.measures.set(name, duration);
      
      if (performance.measure) {
        performance.measure(name, startMark, endMark);
      }
      
      return duration;
    }
    
    return 0;
  }, []);

  const getMetrics = useCallback(() => {
    return {
      marks: Object.fromEntries(performanceRef.current.marks),
      measures: Object.fromEntries(performanceRef.current.measures),
    };
  }, []);

  const clear = useCallback(() => {
    performanceRef.current.marks.clear();
    performanceRef.current.measures.clear();
    
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }, []);

  return { mark, measure, getMetrics, clear };
};

// Route preloading hook
export const useRoutePreloader = () => {
  const preloadedRoutes = useRef<Set<string>>(new Set());

  const preloadRoute = useCallback(async (routeImport: () => Promise<any>) => {
    try {
      await routeImport();
    } catch (error) {
      console.warn('Route preload failed:', error);
    }
  }, []);

  const preloadOnHover = useCallback((routeImport: () => Promise<any>) => {
    return {
      onMouseEnter: () => preloadRoute(routeImport),
      onFocus: () => preloadRoute(routeImport),
    };
  }, [preloadRoute]);

  return { preloadRoute, preloadOnHover };
};

// Memory cleanup hook
export const useCleanup = (cleanupFn: () => void) => {
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

// Network status hook
export const useNetworkStatus = () => {
  const getNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    };
  }, []);

  return { getNetworkInfo };
};
