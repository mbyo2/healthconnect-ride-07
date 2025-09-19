import { logger } from './logger';
import { errorHandler } from './error-handler';

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  bundleSize: number;
  memoryUsage: number;
  networkRequests: number;
}

export interface OptimizationSuggestion {
  type: 'critical' | 'important' | 'minor';
  category: 'bundle' | 'network' | 'rendering' | 'memory' | 'caching';
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  implementation: string;
}

class PerformanceOptimizer {
  private observer: PerformanceObserver | null = null;
  private metrics: Partial<PerformanceMetrics> = {};
  private optimizations: Map<string, boolean> = new Map();

  constructor() {
    this.initializePerformanceMonitoring();
    this.applyOptimizations();
  }

  private initializePerformanceMonitoring(): void {
    try {
      // Web Vitals monitoring
      if ('PerformanceObserver' in window) {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry);
          }
        });

        this.observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      }

      // Navigation timing
      window.addEventListener('load', () => {
        this.collectNavigationMetrics();
      });

      // Memory monitoring
      if ('memory' in performance) {
        setInterval(() => {
          this.collectMemoryMetrics();
        }, 30000); // Every 30 seconds
      }

      logger.info('Performance monitoring initialized', 'PERFORMANCE');
    } catch (error) {
      errorHandler.handleError(error, 'initializePerformanceMonitoring');
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
        }
        break;

      case 'largest-contentful-paint':
        this.metrics.largestContentfulPaint = entry.startTime;
        break;

      case 'first-input':
        this.metrics.firstInputDelay = (entry as PerformanceEventTiming).processingStart - entry.startTime;
        break;

      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.metrics.cumulativeLayoutShift = (this.metrics.cumulativeLayoutShift || 0) + (entry as any).value;
        }
        break;
    }
  }

  private collectNavigationMetrics(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics.loadTime = navigation.loadEventEnd - navigation.navigationStart;
      this.metrics.timeToInteractive = navigation.domInteractive - navigation.navigationStart;
    }

    // Network requests
    const resources = performance.getEntriesByType('resource');
    this.metrics.networkRequests = resources.length;

    // Estimate bundle size from main script
    const mainScript = resources.find(r => r.name.includes('main') || r.name.includes('index'));
    if (mainScript) {
      this.metrics.bundleSize = (mainScript as PerformanceResourceTiming).transferSize || 0;
    }
  }

  private collectMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
    }
  }

  private applyOptimizations(): void {
    // Image lazy loading
    this.enableImageLazyLoading();
    
    // Resource preloading
    this.preloadCriticalResources();
    
    // Code splitting hints
    this.addCodeSplittingHints();
    
    // Service worker optimizations
    this.optimizeServiceWorker();
    
    // Memory leak prevention
    this.preventMemoryLeaks();
    
    // Bundle optimization
    this.optimizeBundle();

    logger.info('Performance optimizations applied', 'PERFORMANCE');
  }

  private enableImageLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      });

      // Observe all images with data-src
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });

      this.optimizations.set('image-lazy-loading', true);
    }
  }

  private preloadCriticalResources(): void {
    const criticalResources = [
      '/fonts/inter-var.woff2',
      '/api/user/profile',
      '/api/appointments/upcoming'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      if (resource.includes('.woff2')) {
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
      } else if (resource.includes('/api/')) {
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
    });

    this.optimizations.set('resource-preloading', true);
  }

  private addCodeSplittingHints(): void {
    // Add modulepreload for dynamic imports
    const modulePreloads = [
      '/src/components/appointments/AppointmentBooking.tsx',
      '/src/components/telemedicine/VideoConsultation.tsx',
      '/src/components/analytics/HealthAnalyticsDashboard.tsx'
    ];

    modulePreloads.forEach(module => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = module;
      document.head.appendChild(link);
    });

    this.optimizations.set('code-splitting-hints', true);
  }

  private optimizeServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      // Register service worker with updateViaCache
      navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      });

      // Handle service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      this.optimizations.set('service-worker-optimization', true);
    }
  }

  private preventMemoryLeaks(): void {
    // Clean up event listeners on page unload
    window.addEventListener('beforeunload', () => {
      // Cancel any ongoing network requests
      if ('AbortController' in window) {
        // This would be implemented in actual network service
      }

      // Clear intervals and timeouts
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }

      const highestIntervalId = setInterval(() => {}, 1000);
      for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
      }
    });

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        if (usedMB > 100) { // Alert if using more than 100MB
          logger.warn(`High memory usage: ${usedMB.toFixed(2)}MB`, 'PERFORMANCE');
        }
      }, 60000); // Check every minute
    }

    this.optimizations.set('memory-leak-prevention', true);
  }

  private optimizeBundle(): void {
    // Tree shaking hints
    if (process.env.NODE_ENV === 'production') {
      // Mark unused exports for tree shaking
      const unusedExports = this.detectUnusedExports();
      if (unusedExports.length > 0) {
        logger.info(`Found ${unusedExports.length} potentially unused exports`, 'PERFORMANCE');
      }
    }

    // Dynamic import optimization
    this.optimizeDynamicImports();

    this.optimizations.set('bundle-optimization', true);
  }

  private detectUnusedExports(): string[] {
    // This would require static analysis in a real implementation
    // For now, return empty array
    return [];
  }

  private optimizeDynamicImports(): void {
    // Prefetch dynamic imports based on user behavior
    const routes = [
      { path: '/appointments', component: () => import('@/components/appointments/AppointmentBooking') },
      { path: '/telemedicine', component: () => import('@/components/telemedicine/VideoConsultation') },
      { path: '/analytics', component: () => import('@/components/analytics/HealthAnalyticsDashboard') }
    ];

    // Prefetch likely next routes
    const currentPath = window.location.pathname;
    routes.forEach(route => {
      if (route.path !== currentPath) {
        // Prefetch after a delay
        setTimeout(() => {
          route.component();
        }, 2000);
      }
    });
  }

  getMetrics(): PerformanceMetrics {
    return {
      loadTime: this.metrics.loadTime || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      firstInputDelay: this.metrics.firstInputDelay || 0,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift || 0,
      timeToInteractive: this.metrics.timeToInteractive || 0,
      bundleSize: this.metrics.bundleSize || 0,
      memoryUsage: this.metrics.memoryUsage || 0,
      networkRequests: this.metrics.networkRequests || 0
    };
  }

  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const metrics = this.getMetrics();

    // Bundle size suggestions
    if (metrics.bundleSize > 1024 * 1024) { // > 1MB
      suggestions.push({
        type: 'critical',
        category: 'bundle',
        description: 'Bundle size is large. Consider code splitting and tree shaking.',
        impact: 'high',
        effort: 'medium',
        implementation: 'Implement dynamic imports for route-based code splitting'
      });
    }

    // LCP suggestions
    if (metrics.largestContentfulPaint > 2500) {
      suggestions.push({
        type: 'important',
        category: 'rendering',
        description: 'Largest Contentful Paint is slow. Optimize critical rendering path.',
        impact: 'high',
        effort: 'medium',
        implementation: 'Preload critical resources and optimize images'
      });
    }

    // FID suggestions
    if (metrics.firstInputDelay > 100) {
      suggestions.push({
        type: 'important',
        category: 'rendering',
        description: 'First Input Delay is high. Reduce JavaScript execution time.',
        impact: 'medium',
        effort: 'high',
        implementation: 'Break up long tasks and defer non-critical JavaScript'
      });
    }

    // CLS suggestions
    if (metrics.cumulativeLayoutShift > 0.1) {
      suggestions.push({
        type: 'important',
        category: 'rendering',
        description: 'Cumulative Layout Shift is high. Stabilize page layout.',
        impact: 'medium',
        effort: 'low',
        implementation: 'Add size attributes to images and reserve space for dynamic content'
      });
    }

    // Memory suggestions
    if (metrics.memoryUsage > 50 * 1024 * 1024) { // > 50MB
      suggestions.push({
        type: 'minor',
        category: 'memory',
        description: 'Memory usage is high. Check for memory leaks.',
        impact: 'medium',
        effort: 'high',
        implementation: 'Profile memory usage and clean up unused objects'
      });
    }

    // Network suggestions
    if (metrics.networkRequests > 50) {
      suggestions.push({
        type: 'minor',
        category: 'network',
        description: 'High number of network requests. Consider bundling resources.',
        impact: 'low',
        effort: 'medium',
        implementation: 'Combine CSS/JS files and use image sprites where appropriate'
      });
    }

    return suggestions;
  }

  generatePerformanceReport(): any {
    const metrics = this.getMetrics();
    const suggestions = this.getOptimizationSuggestions();
    
    // Calculate performance score (0-100)
    let score = 100;
    
    // Deduct points based on metrics
    if (metrics.firstContentfulPaint > 1800) score -= 10;
    if (metrics.largestContentfulPaint > 2500) score -= 15;
    if (metrics.firstInputDelay > 100) score -= 10;
    if (metrics.cumulativeLayoutShift > 0.1) score -= 10;
    if (metrics.bundleSize > 1024 * 1024) score -= 15;
    if (metrics.memoryUsage > 50 * 1024 * 1024) score -= 10;

    score = Math.max(0, score);

    return {
      score,
      metrics,
      suggestions,
      optimizations: Array.from(this.optimizations.entries()).map(([name, enabled]) => ({
        name,
        enabled,
        description: this.getOptimizationDescription(name)
      })),
      recommendations: this.generateRecommendations(suggestions)
    };
  }

  private getOptimizationDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'image-lazy-loading': 'Lazy load images to reduce initial page load time',
      'resource-preloading': 'Preload critical resources for faster rendering',
      'code-splitting-hints': 'Add module preload hints for better code splitting',
      'service-worker-optimization': 'Optimize service worker for better caching',
      'memory-leak-prevention': 'Prevent memory leaks and monitor usage',
      'bundle-optimization': 'Optimize bundle size and tree shaking'
    };

    return descriptions[name] || 'Performance optimization';
  }

  private generateRecommendations(suggestions: OptimizationSuggestion[]): string[] {
    const recommendations = [];
    
    const criticalSuggestions = suggestions.filter(s => s.type === 'critical');
    if (criticalSuggestions.length > 0) {
      recommendations.push('Address critical performance issues first');
    }

    const bundleSuggestions = suggestions.filter(s => s.category === 'bundle');
    if (bundleSuggestions.length > 0) {
      recommendations.push('Implement code splitting to reduce bundle size');
    }

    const renderingSuggestions = suggestions.filter(s => s.category === 'rendering');
    if (renderingSuggestions.length > 0) {
      recommendations.push('Optimize critical rendering path and Core Web Vitals');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is good! Continue monitoring metrics.');
    }

    return recommendations;
  }

  async runPerformanceAudit(): Promise<any> {
    try {
      // Collect fresh metrics
      this.collectNavigationMetrics();
      this.collectMemoryMetrics();

      // Generate comprehensive report
      const report = this.generatePerformanceReport();
      
      logger.info('Performance audit completed', 'PERFORMANCE', {
        score: report.score,
        suggestions: report.suggestions.length
      });

      return report;
    } catch (error) {
      errorHandler.handleError(error, 'runPerformanceAudit');
      return null;
    }
  }

  optimizeForMobile(): void {
    // Mobile-specific optimizations
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(meta);
    }

    // Reduce animations on mobile
    if ('ontouchstart' in window) {
      document.body.classList.add('mobile-device');
    }

    // Optimize touch interactions
    document.body.style.touchAction = 'manipulation';

    logger.info('Mobile optimizations applied', 'PERFORMANCE');
  }

  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
