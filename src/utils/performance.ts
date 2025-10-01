// Performance optimization utilities for HealthConnect
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Debounce hook for search and input optimization
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for scroll and resize events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Virtual scrolling hook for large lists
export const useVirtualScrolling = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    itemCount
  );

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useThrottle((e: Event) => {
    const target = e.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, 16); // ~60fps

  return {
    visibleStart,
    visibleEnd,
    totalHeight,
    offsetY,
    handleScroll,
  };
};

// Memoized component wrapper
export const withMemo = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, areEqual);
};

// Performance monitoring
export const performanceMonitor = {
  // Mark performance timing
  mark: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },

  // Measure performance between marks
  measure: (name: string, startMark: string, endMark?: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);
    }
  },

  // Get performance entries
  getEntries: (type?: string) => {
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      return type ? performance.getEntriesByType(type) : performance.getEntries();
    }
    return [];
  },

  // Clear performance data
  clear: () => {
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  },
};

// Image optimization utilities
export const imageOptimization = {
  // Create optimized image URL with WebP support
  getOptimizedImageUrl: (src: string, width?: number, height?: number) => {
    if (!src) return '';
    
    // Check if browser supports WebP
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    // For external images or if no optimization needed
    if (src.startsWith('http') || (!width && !height)) {
      return src;
    }

    // Add size parameters if provided
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    if (supportsWebP) params.append('format', 'webp');

    return `${src}?${params.toString()}`;
  },

  // Preload critical images
  preloadImage: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  },

  // Lazy load image with intersection observer
  useLazyImage: (src: string, placeholder?: string) => {
    const [imageSrc, setImageSrc] = useState(placeholder || '');
    const [isLoaded, setIsLoaded] = useState(false);
    const { elementRef, hasIntersected } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: '50px',
    });

    useEffect(() => {
      if (hasIntersected && src) {
        const img = new Image();
        img.onload = () => {
          setImageSrc(src);
          setIsLoaded(true);
        };
        img.src = src;
      }
    }, [hasIntersected, src]);

    return { elementRef, imageSrc, isLoaded };
  },
};

// Bundle size optimization utilities
export const bundleOptimization = {
  // Dynamic import with error handling
  dynamicImport: async <T>(importFn: () => Promise<T>): Promise<T | null> => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Dynamic import failed:', error);
      return null;
    }
  },

  // Preload route component
  preloadRoute: (routeImport: () => Promise<any>) => {
    // Preload on hover or focus for better UX
    const preload = () => {
      routeImport().catch(console.error);
    };

    return { preload };
  },
};

// Memory optimization
export const memoryOptimization = {
  // Cleanup function for component unmount
  useCleanup: (cleanupFn: () => void) => {
    useEffect(() => {
      return cleanupFn;
    }, [cleanupFn]);
  },

  // Weak map for caching with automatic cleanup
  createWeakCache: <K extends object, V>() => {
    const cache = new WeakMap<K, V>();
    
    return {
      get: (key: K) => cache.get(key),
      set: (key: K, value: V) => cache.set(key, value),
      has: (key: K) => cache.has(key),
      delete: (key: K) => cache.delete(key),
    };
  },
};

// Network optimization
export const networkOptimization = {
  // Check network connection quality
  getNetworkInfo: () => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    };
  },

  // Adaptive loading based on network
  shouldLoadHighQuality: () => {
    const { effectiveType, saveData } = networkOptimization.getNetworkInfo();
    return !saveData && (effectiveType === '4g' || effectiveType === '3g');
  },
};

// React Suspense utilities
export const suspenseUtils = {
  // Preload component for better UX
  preloadComponent: (componentImport: () => Promise<any>) => {
    let componentPromise: Promise<any> | null = null;
    
    return {
      preload: () => {
        if (!componentPromise) {
          componentPromise = componentImport();
        }
        return componentPromise;
      },
      Component: React.lazy(() => {
        if (componentPromise) {
          return componentPromise;
        }
        return componentImport();
      }),
    };
  },
};
