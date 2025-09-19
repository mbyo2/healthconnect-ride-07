import { createClient } from '@supabase/supabase-js';
import { errorHandler } from './error-handler';
import { logger } from './logger';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Custom Metrics
  pageLoadTime: number;
  domContentLoaded: number;
  resourceLoadTime: number;
  memoryUsage: number;
  jsHeapSize: number;
  
  // User Experience
  interactionLatency: number;
  scrollLatency: number;
  renderingTime: number;
  
  // Network
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  
  // Device
  deviceMemory: number;
  hardwareConcurrency: number;
  
  // Timestamp and context
  timestamp: Date;
  url: string;
  userAgent: string;
  userId?: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_page' | 'memory_leak' | 'high_latency' | 'poor_vitals' | 'resource_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: Partial<PerformanceMetrics>;
  timestamp: Date;
  resolved: boolean;
}

export interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
  cached: boolean;
  protocol: string;
}

class PerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private metricsBuffer: PerformanceMetrics[] = [];
  private alertThresholds = {
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1
    pageLoadTime: 3000, // 3s
    memoryUsage: 100 * 1024 * 1024, // 100MB
    interactionLatency: 200 // 200ms
  };

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    try {
      // Initialize Core Web Vitals monitoring
      this.initializeCoreWebVitals();
      
      // Initialize resource monitoring
      this.initializeResourceMonitoring();
      
      // Initialize user interaction monitoring
      this.initializeInteractionMonitoring();
      
      // Initialize memory monitoring
      this.initializeMemoryMonitoring();
      
      // Initialize network monitoring
      this.initializeNetworkMonitoring();
      
      // Start periodic reporting
      this.startPeriodicReporting();

      logger.info('Performance monitoring initialized', 'PERFORMANCE');
    } catch (error) {
      errorHandler.handleError(error, 'initializeMonitoring');
    }
  }

  private initializeCoreWebVitals(): void {
    try {
      if ('PerformanceObserver' in window) {
        // Largest Contentful Paint
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.recordMetric('lcp', entry.startTime);
            }
            if (entry.entryType === 'first-input') {
              this.recordMetric('fid', (entry as any).processingStart - entry.startTime);
            }
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              this.recordMetric('cls', (entry as any).value);
            }
          }
        });

        this.observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      }

      // Navigation timing for additional metrics
      window.addEventListener('load', () => {
        setTimeout(() => this.collectNavigationMetrics(), 0);
      });

    } catch (error) {
      logger.error('Error initializing Core Web Vitals', 'PERFORMANCE', error);
    }
  }

  private collectNavigationMetrics(): void {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = {
          fcp: this.getFirstContentfulPaint(),
          ttfb: navigation.responseStart - navigation.requestStart,
          pageLoadTime: navigation.loadEventEnd - navigation.navigationStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          resourceLoadTime: navigation.loadEventEnd - navigation.domContentLoadedEventEnd
        };

        Object.entries(metrics).forEach(([key, value]) => {
          if (value > 0) {
            this.recordMetric(key as keyof PerformanceMetrics, value);
          }
        });
      }
    } catch (error) {
      logger.error('Error collecting navigation metrics', 'PERFORMANCE', error);
    }
  }

  private getFirstContentfulPaint(): number {
    try {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      return fcpEntry ? fcpEntry.startTime : 0;
    } catch {
      return 0;
    }
  }

  private initializeResourceMonitoring(): void {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.analyzeResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      logger.error('Error initializing resource monitoring', 'PERFORMANCE', error);
    }
  }

  private analyzeResourceTiming(entry: PerformanceResourceTiming): void {
    try {
      const resourceTiming: ResourceTiming = {
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0,
        type: this.getResourceType(entry.name),
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
        protocol: entry.nextHopProtocol || 'unknown'
      };

      // Alert on slow resources
      if (resourceTiming.duration > 2000) { // 2 seconds
        this.createPerformanceAlert(
          'resource_error',
          'high',
          `Slow resource loading: ${resourceTiming.name} took ${resourceTiming.duration}ms`,
          { resourceLoadTime: resourceTiming.duration }
        );
      }

      // Log resource metrics
      logger.debug('Resource timing', 'PERFORMANCE', resourceTiming);
    } catch (error) {
      logger.error('Error analyzing resource timing', 'PERFORMANCE', error);
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  private initializeInteractionMonitoring(): void {
    try {
      let interactionStart = 0;

      // Monitor click interactions
      document.addEventListener('click', () => {
        interactionStart = performance.now();
      }, { passive: true });

      // Monitor interaction completion
      document.addEventListener('click', () => {
        requestAnimationFrame(() => {
          const latency = performance.now() - interactionStart;
          this.recordMetric('interactionLatency', latency);
          
          if (latency > this.alertThresholds.interactionLatency) {
            this.createPerformanceAlert(
              'high_latency',
              'medium',
              `High interaction latency: ${latency}ms`,
              { interactionLatency: latency }
            );
          }
        });
      }, { passive: true });

      // Monitor scroll performance
      let scrollStart = 0;
      document.addEventListener('scroll', () => {
        scrollStart = performance.now();
      }, { passive: true });

      document.addEventListener('scrollend', () => {
        const scrollLatency = performance.now() - scrollStart;
        this.recordMetric('scrollLatency', scrollLatency);
      }, { passive: true });

    } catch (error) {
      logger.error('Error initializing interaction monitoring', 'PERFORMANCE', error);
    }
  }

  private initializeMemoryMonitoring(): void {
    try {
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          const memoryUsage = memory.usedJSHeapSize;
          const heapSize = memory.totalJSHeapSize;

          this.recordMetric('memoryUsage', memoryUsage);
          this.recordMetric('jsHeapSize', heapSize);

          // Alert on high memory usage
          if (memoryUsage > this.alertThresholds.memoryUsage) {
            this.createPerformanceAlert(
              'memory_leak',
              'high',
              `High memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
              { memoryUsage, jsHeapSize }
            );
          }
        }, 30000); // Every 30 seconds
      }
    } catch (error) {
      logger.error('Error initializing memory monitoring', 'PERFORMANCE', error);
    }
  }

  private initializeNetworkMonitoring(): void {
    try {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        
        const updateNetworkInfo = () => {
          this.recordNetworkMetrics({
            connectionType: connection.type || 'unknown',
            effectiveType: connection.effectiveType || 'unknown',
            downlink: connection.downlink || 0,
            rtt: connection.rtt || 0
          });
        };

        updateNetworkInfo();
        connection.addEventListener('change', updateNetworkInfo);
      }
    } catch (error) {
      logger.error('Error initializing network monitoring', 'PERFORMANCE', error);
    }
  }

  private recordMetric(key: keyof PerformanceMetrics, value: number): void {
    try {
      // Store in buffer for batch processing
      const existingMetric = this.metricsBuffer.find(m => 
        m.url === window.location.href && 
        Date.now() - m.timestamp.getTime() < 60000 // Within last minute
      );

      if (existingMetric) {
        (existingMetric as any)[key] = value;
      } else {
        const newMetric: Partial<PerformanceMetrics> = {
          [key]: value,
          timestamp: new Date(),
          url: window.location.href,
          userAgent: navigator.userAgent
        };
        
        this.metricsBuffer.push(newMetric as PerformanceMetrics);
      }

      // Check thresholds
      this.checkPerformanceThresholds(key, value);
    } catch (error) {
      logger.error('Error recording metric', 'PERFORMANCE', error);
    }
  }

  private recordNetworkMetrics(networkInfo: {
    connectionType: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
  }): void {
    try {
      const metric = this.getCurrentMetric();
      Object.assign(metric, networkInfo);
    } catch (error) {
      logger.error('Error recording network metrics', 'PERFORMANCE', error);
    }
  }

  private getCurrentMetric(): Partial<PerformanceMetrics> {
    const current = this.metricsBuffer.find(m => 
      m.url === window.location.href && 
      Date.now() - m.timestamp.getTime() < 60000
    );

    if (current) {
      return current;
    }

    const newMetric: Partial<PerformanceMetrics> = {
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      deviceMemory: (navigator as any).deviceMemory || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0
    };

    this.metricsBuffer.push(newMetric as PerformanceMetrics);
    return newMetric;
  }

  private checkPerformanceThresholds(key: keyof PerformanceMetrics, value: number): void {
    try {
      const threshold = this.alertThresholds[key as keyof typeof this.alertThresholds];
      
      if (threshold && value > threshold) {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        
        if (value > threshold * 2) severity = 'high';
        if (value > threshold * 3) severity = 'critical';

        this.createPerformanceAlert(
          'poor_vitals',
          severity,
          `Poor ${key} performance: ${value}ms (threshold: ${threshold}ms)`,
          { [key]: value } as Partial<PerformanceMetrics>
        );
      }
    } catch (error) {
      logger.error('Error checking performance thresholds', 'PERFORMANCE', error);
    }
  }

  private async createPerformanceAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metrics: Partial<PerformanceMetrics>
  ): Promise<void> {
    try {
      const alert: Omit<PerformanceAlert, 'id'> = {
        type,
        severity,
        message,
        metrics,
        timestamp: new Date(),
        resolved: false
      };

      const { data, error } = await supabase
        .from('performance_alerts')
        .insert({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          metrics: alert.metrics,
          timestamp: alert.timestamp.toISOString(),
          resolved: false,
          url: window.location.href,
          user_agent: navigator.userAgent
        })
        .select()
        .single();

      if (error) throw error;

      logger.warn('Performance alert created', 'PERFORMANCE', { 
        alertId: data.id, 
        type, 
        severity, 
        message 
      });
    } catch (error) {
      errorHandler.handleError(error, 'createPerformanceAlert');
    }
  }

  private startPeriodicReporting(): void {
    setInterval(() => {
      this.flushMetrics();
    }, 60000); // Every minute

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushMetrics();
    });
  }

  private async flushMetrics(): Promise<void> {
    try {
      if (this.metricsBuffer.length === 0) return;

      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const metricsWithUser = metricsToFlush.map(metric => ({
        ...metric,
        user_id: user?.id,
        timestamp: metric.timestamp.toISOString()
      }));

      const { error } = await supabase
        .from('performance_metrics')
        .insert(metricsWithUser);

      if (error) throw error;

      logger.info('Performance metrics flushed', 'PERFORMANCE', { 
        count: metricsToFlush.length 
      });
    } catch (error) {
      errorHandler.handleError(error, 'flushMetrics');
      // Re-add metrics to buffer on error
      this.metricsBuffer.unshift(...this.metricsBuffer);
    }
  }

  async getPerformanceReport(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<{
    averageMetrics: Partial<PerformanceMetrics>;
    alerts: PerformanceAlert[];
    trends: { metric: string; trend: 'improving' | 'degrading' | 'stable' }[];
  }> {
    try {
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRangeMs[timeRange]).toISOString();

      // Get metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false });

      if (metricsError) throw metricsError;

      // Get alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('performance_alerts')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false });

      if (alertsError) throw alertsError;

      // Calculate averages
      const averageMetrics = this.calculateAverageMetrics(metrics || []);
      
      // Analyze trends
      const trends = this.analyzeTrends(metrics || []);

      return {
        averageMetrics,
        alerts: (alerts || []).map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          metrics: alert.metrics,
          timestamp: new Date(alert.timestamp),
          resolved: alert.resolved
        })),
        trends
      };
    } catch (error) {
      errorHandler.handleError(error, 'getPerformanceReport');
      return {
        averageMetrics: {},
        alerts: [],
        trends: []
      };
    }
  }

  private calculateAverageMetrics(metrics: any[]): Partial<PerformanceMetrics> {
    if (metrics.length === 0) return {};

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    metrics.forEach(metric => {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number' && key !== 'user_id') {
          sums[key] = (sums[key] || 0) + value;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });

    const averages: Record<string, number> = {};
    Object.keys(sums).forEach(key => {
      averages[key] = sums[key] / counts[key];
    });

    return averages as Partial<PerformanceMetrics>;
  }

  private analyzeTrends(metrics: any[]): { metric: string; trend: 'improving' | 'degrading' | 'stable' }[] {
    const trends: { metric: string; trend: 'improving' | 'degrading' | 'stable' }[] = [];
    
    if (metrics.length < 10) return trends; // Need sufficient data

    const keyMetrics = ['lcp', 'fid', 'cls', 'pageLoadTime', 'memoryUsage'];
    
    keyMetrics.forEach(metric => {
      const values = metrics
        .map(m => m[metric])
        .filter(v => typeof v === 'number')
        .slice(0, 20); // Last 20 data points

      if (values.length >= 10) {
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const change = (secondAvg - firstAvg) / firstAvg;
        
        let trend: 'improving' | 'degrading' | 'stable' = 'stable';
        if (Math.abs(change) > 0.1) { // 10% change threshold
          trend = change < 0 ? 'improving' : 'degrading';
        }
        
        trends.push({ metric, trend });
      }
    });

    return trends;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('performance_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      logger.info('Performance alert resolved', 'PERFORMANCE', { alertId });
      return true;
    } catch (error) {
      errorHandler.handleError(error, 'resolveAlert');
      return false;
    }
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.flushMetrics();
  }
}

export const performanceMonitor = new PerformanceMonitor();
