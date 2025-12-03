import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchAdjacentRoutes, createPrefetchHandler, initializePrefetching } from '@/utils/route-prefetch';

/**
 * Hook to automatically prefetch adjacent routes based on current location
 */
export const useRoutePrefetch = () => {
  const location = useLocation();

  useEffect(() => {
    // Prefetch adjacent routes when location changes
    prefetchAdjacentRoutes(location.pathname);
  }, [location.pathname]);
};

/**
 * Hook to initialize route prefetching on app load
 */
export const useInitializePrefetch = () => {
  useEffect(() => {
    initializePrefetching();
  }, []);
};

/**
 * Hook to get prefetch handlers for a link
 */
export const usePrefetchLink = (route: string) => {
  return createPrefetchHandler(route);
};

export { prefetchAdjacentRoutes, createPrefetchHandler };
