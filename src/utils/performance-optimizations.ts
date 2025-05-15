import { debounce } from "lodash";

// Type definitions for performance data
type PerformanceMetric = {
  name: string;
  value: number;
  timestamp: number;
};

// Singleton class to track performance metrics
class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;
  
  private constructor() {}
  
  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }
  
  trackMetric(name: string, value: number): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now()
    });
    
    // Keep metrics array from growing too large
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Log if in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Performance] ${name}: ${value.toFixed(2)}`);
    }
  }
  
  getMetrics(metricName?: string): PerformanceMetric[] {
    if (metricName) {
      return this.metrics.filter(m => m.name === metricName);
    }
    return [...this.metrics];
  }
  
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceTracker = PerformanceTracker.getInstance();

// Utility to measure component render time
export function measureRenderTime(componentName: string): () => void {
  const startTime = performance.now();
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    performanceTracker.trackMetric(`render_time_${componentName}`, duration);
  };
}

// Optimized event handlers with debouncing
export const createDebouncedHandler = <T extends (...args: any[]) => any>(
  fn: T, 
  wait = 300
): ((...args: Parameters<T>) => void) => {
  return debounce(fn, wait);
};

// Image loading optimization
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Lazy initialization for expensive operations
export function createLazyInitializer<T>(factory: () => T): () => T {
  let instance: T | undefined;
  return () => {
    if (instance === undefined) {
      instance = factory();
    }
    return instance;
  };
}
