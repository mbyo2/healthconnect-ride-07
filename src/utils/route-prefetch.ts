/**
 * Route prefetching utility for faster navigation
 */

// Map of routes to their lazy import functions
const routeModules: Record<string, () => Promise<any>> = {
  '/home': () => import('@/pages/Home'),
  '/appointments': () => import('@/pages/Appointments'),
  '/symptoms': () => import('@/pages/Symptoms'),
  '/ai-diagnostics': () => import('@/pages/AIDiagnostics'),
  '/medical-records': () => import('@/pages/MedicalRecords'),
  '/prescriptions': () => import('@/pages/Prescriptions'),
  '/chat': () => import('@/pages/Chat'),
  '/connections': () => import('@/pages/Connections'),
  '/profile': () => import('@/pages/Profile'),
  '/settings': () => import('@/pages/Settings'),
  '/iot-monitoring': () => import('@/pages/IoTMonitoring'),
  '/health-analytics': () => import('@/pages/HealthAnalytics'),
  '/video-consultations': () => import('@/pages/VideoConsultations'),
  '/marketplace': () => import('@/pages/Marketplace'),
  '/emergency': () => import('@/pages/Emergency'),
};

// Track which routes have been prefetched
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a specific route's module
 */
export const prefetchRoute = async (route: string): Promise<void> => {
  if (prefetchedRoutes.has(route)) return;
  
  const importFn = routeModules[route];
  if (importFn) {
    try {
      await importFn();
      prefetchedRoutes.add(route);
    } catch (err) {
      console.warn(`Failed to prefetch route ${route}:`, err);
    }
  }
};

/**
 * Prefetch multiple routes
 */
export const prefetchRoutes = async (routes: string[]): Promise<void> => {
  await Promise.all(routes.map(prefetchRoute));
};

/**
 * Prefetch routes based on current location (anticipate navigation)
 */
export const prefetchAdjacentRoutes = (currentRoute: string): void => {
  const adjacencyMap: Record<string, string[]> = {
    '/home': ['/appointments', '/symptoms', '/ai-diagnostics', '/medical-records'],
    '/symptoms': ['/ai-diagnostics', '/medical-records', '/home'],
    '/ai-diagnostics': ['/symptoms', '/medical-records', '/appointments'],
    '/appointments': ['/video-consultations', '/chat', '/home'],
    '/medical-records': ['/prescriptions', '/health-analytics', '/home'],
    '/iot-monitoring': ['/health-analytics', '/emergency', '/home'],
    '/profile': ['/settings', '/home'],
  };

  const routesToPrefetch = adjacencyMap[currentRoute] || [];
  
  // Use requestIdleCallback for non-blocking prefetch
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      prefetchRoutes(routesToPrefetch);
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      prefetchRoutes(routesToPrefetch);
    }, 100);
  }
};

/**
 * Prefetch on hover/focus for instant navigation
 */
export const createPrefetchHandler = (route: string) => {
  let prefetchTimeout: NodeJS.Timeout | null = null;
  
  return {
    onMouseEnter: () => {
      prefetchTimeout = setTimeout(() => prefetchRoute(route), 50);
    },
    onMouseLeave: () => {
      if (prefetchTimeout) clearTimeout(prefetchTimeout);
    },
    onFocus: () => prefetchRoute(route),
  };
};

/**
 * Initialize critical routes prefetching after initial load
 */
export const initializePrefetching = (): void => {
  const criticalRoutes = ['/home', '/symptoms', '/ai-diagnostics'];
  
  // Wait for initial load to complete
  if (document.readyState === 'complete') {
    prefetchRoutes(criticalRoutes);
  } else {
    window.addEventListener('load', () => {
      // Delay prefetch to not interfere with initial render
      setTimeout(() => prefetchRoutes(criticalRoutes), 1000);
    }, { once: true });
  }
};
