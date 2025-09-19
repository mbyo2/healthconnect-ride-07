import { createClient } from '@supabase/supabase-js';
import { errorHandler } from './error-handler';
import { logger } from './logger';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security' | 'payment';
  outcome: 'success' | 'failure' | 'partial';
  sessionId?: string;
  deviceInfo?: string;
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  category?: string;
  severity?: string;
  outcome?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ComplianceReport {
  period: string;
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  failureRate: number;
  criticalEvents: AuditEvent[];
  complianceScore: number;
  recommendations: string[];
}

class AuditLogger {
  private eventBuffer: Omit<AuditEvent, 'id'>[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeAuditLogger();
  }

  private initializeAuditLogger(): void {
    try {
      // Start periodic flushing
      this.flushInterval = setInterval(() => {
        this.flushEvents();
      }, this.FLUSH_INTERVAL);

      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        this.flushEvents();
      });

      logger.info('Audit logger initialized', 'AUDIT');
    } catch (error) {
      errorHandler.handleError(error, 'initializeAuditLogger');
    }
  }

  async logEvent(
    userId: string,
    action: string,
    resource: string,
    details: Record<string, any> = {},
    options: {
      resourceId?: string;
      severity?: AuditEvent['severity'];
      category?: AuditEvent['category'];
      outcome?: AuditEvent['outcome'];
      sessionId?: string;
    } = {}
  ): Promise<void> {
    try {
      const auditEvent: Omit<AuditEvent, 'id'> = {
        userId,
        action,
        resource,
        resourceId: options.resourceId,
        details: this.sanitizeDetails(details),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        severity: options.severity || 'info',
        category: options.category || 'system',
        outcome: options.outcome || 'success',
        sessionId: options.sessionId || this.getCurrentSessionId(),
        deviceInfo: this.getDeviceInfo()
      };

      // Add to buffer
      this.eventBuffer.push(auditEvent);

      // Flush if buffer is full or if critical event
      if (this.eventBuffer.length >= this.BUFFER_SIZE || auditEvent.severity === 'critical') {
        await this.flushEvents();
      }

      logger.debug('Audit event logged', 'AUDIT', { action, resource, severity: auditEvent.severity });
    } catch (error) {
      errorHandler.handleError(error, 'logEvent');
    }
  }

  // Specific audit logging methods for common actions
  async logAuthentication(userId: string, action: 'login' | 'logout' | 'failed_login', details: Record<string, any> = {}): Promise<void> {
    await this.logEvent(userId, action, 'authentication', details, {
      category: 'authentication',
      severity: action === 'failed_login' ? 'warning' : 'info',
      outcome: action === 'failed_login' ? 'failure' : 'success'
    });
  }

  async logDataAccess(userId: string, resource: string, resourceId: string, action: 'read' | 'list', details: Record<string, any> = {}): Promise<void> {
    await this.logEvent(userId, action, resource, details, {
      resourceId,
      category: 'data_access',
      severity: 'info',
      outcome: 'success'
    });
  }

  async logDataModification(userId: string, resource: string, resourceId: string, action: 'create' | 'update' | 'delete', details: Record<string, any> = {}): Promise<void> {
    await this.logEvent(userId, action, resource, details, {
      resourceId,
      category: 'data_modification',
      severity: action === 'delete' ? 'warning' : 'info',
      outcome: 'success'
    });
  }

  async logPaymentEvent(userId: string, action: string, paymentId: string, details: Record<string, any> = {}): Promise<void> {
    await this.logEvent(userId, action, 'payment', details, {
      resourceId: paymentId,
      category: 'payment',
      severity: details.amount > 10000 ? 'warning' : 'info',
      outcome: details.success ? 'success' : 'failure'
    });
  }

  async logSecurityEvent(userId: string, action: string, details: Record<string, any> = {}): Promise<void> {
    await this.logEvent(userId, action, 'security', details, {
      category: 'security',
      severity: details.severity || 'warning',
      outcome: details.blocked ? 'failure' : 'success'
    });
  }

  async logSystemEvent(action: string, details: Record<string, any> = {}): Promise<void> {
    await this.logEvent('system', action, 'system', details, {
      category: 'system',
      severity: details.error ? 'error' : 'info',
      outcome: details.error ? 'failure' : 'success'
    });
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...';
      }
    });

    return sanitized;
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, this should be handled by the backend
      return 'Unknown IP';
    } catch {
      return 'Unknown IP';
    }
  }

  private getCurrentSessionId(): string {
    return localStorage.getItem('current-session-id') || 'unknown';
  }

  private getDeviceInfo(): string {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'Mobile Device';
    } else if (/Tablet/.test(userAgent)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const eventsToFlush = [...this.eventBuffer];
      this.eventBuffer = [];

      const { error } = await supabase
        .from('audit_logs')
        .insert(eventsToFlush.map(event => ({
          user_id: event.userId,
          action: event.action,
          resource: event.resource,
          resource_id: event.resourceId,
          details: event.details,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          timestamp: event.timestamp.toISOString(),
          severity: event.severity,
          category: event.category,
          outcome: event.outcome,
          session_id: event.sessionId,
          device_info: event.deviceInfo
        })));

      if (error) throw error;

      logger.info('Audit events flushed', 'AUDIT', { count: eventsToFlush.length });
    } catch (error) {
      errorHandler.handleError(error, 'flushEvents');
      // Re-add events to buffer on error
      this.eventBuffer.unshift(...this.eventBuffer);
    }
  }

  async queryAuditLogs(query: AuditQuery): Promise<AuditEvent[]> {
    try {
      let supabaseQuery = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (query.userId) {
        supabaseQuery = supabaseQuery.eq('user_id', query.userId);
      }
      if (query.action) {
        supabaseQuery = supabaseQuery.eq('action', query.action);
      }
      if (query.resource) {
        supabaseQuery = supabaseQuery.eq('resource', query.resource);
      }
      if (query.category) {
        supabaseQuery = supabaseQuery.eq('category', query.category);
      }
      if (query.severity) {
        supabaseQuery = supabaseQuery.eq('severity', query.severity);
      }
      if (query.outcome) {
        supabaseQuery = supabaseQuery.eq('outcome', query.outcome);
      }
      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.startDate.toISOString());
      }
      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.endDate.toISOString());
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, (query.offset + (query.limit || 50)) - 1);
      }

      const { data, error } = await supabaseQuery;
      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id,
        details: log.details,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        timestamp: new Date(log.timestamp),
        severity: log.severity,
        category: log.category,
        outcome: log.outcome,
        sessionId: log.session_id,
        deviceInfo: log.device_info
      }));
    } catch (error) {
      errorHandler.handleError(error, 'queryAuditLogs');
      return [];
    }
  }

  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    try {
      const events = await this.queryAuditLogs({ startDate, endDate });
      
      const totalEvents = events.length;
      const eventsByCategory: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      let failureCount = 0;

      events.forEach(event => {
        // Count by category
        eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
        
        // Count by severity
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        
        // Count failures
        if (event.outcome === 'failure') {
          failureCount++;
        }
      });

      const failureRate = totalEvents > 0 ? (failureCount / totalEvents) * 100 : 0;
      const criticalEvents = events.filter(e => e.severity === 'critical');
      
      // Calculate compliance score (0-100)
      let complianceScore = 100;
      complianceScore -= Math.min(30, failureRate); // Deduct for failures
      complianceScore -= Math.min(20, criticalEvents.length * 2); // Deduct for critical events
      complianceScore = Math.max(0, complianceScore);

      const recommendations = this.generateComplianceRecommendations(
        failureRate,
        criticalEvents.length,
        eventsByCategory
      );

      return {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        totalEvents,
        eventsByCategory,
        eventsBySeverity,
        failureRate,
        criticalEvents,
        complianceScore,
        recommendations
      };
    } catch (error) {
      errorHandler.handleError(error, 'generateComplianceReport');
      return {
        period: 'Error generating report',
        totalEvents: 0,
        eventsByCategory: {},
        eventsBySeverity: {},
        failureRate: 0,
        criticalEvents: [],
        complianceScore: 0,
        recommendations: ['Error generating compliance report']
      };
    }
  }

  private generateComplianceRecommendations(
    failureRate: number,
    criticalEventCount: number,
    eventsByCategory: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (failureRate > 10) {
      recommendations.push('High failure rate detected. Review failed operations and implement additional error handling.');
    }

    if (criticalEventCount > 5) {
      recommendations.push('Multiple critical security events detected. Conduct immediate security review.');
    }

    if (eventsByCategory.authentication > eventsByCategory.data_access * 2) {
      recommendations.push('High authentication activity. Consider implementing session management improvements.');
    }

    if (eventsByCategory.payment && eventsByCategory.payment > 100) {
      recommendations.push('High payment activity. Ensure fraud detection systems are properly configured.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Audit logs show normal activity patterns. Continue monitoring.');
    }

    return recommendations;
  }

  async exportAuditLogs(query: AuditQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const events = await this.queryAuditLogs(query);
      
      if (format === 'csv') {
        return this.convertToCSV(events);
      } else {
        return JSON.stringify(events, null, 2);
      }
    } catch (error) {
      errorHandler.handleError(error, 'exportAuditLogs');
      return '';
    }
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'ID', 'User ID', 'Action', 'Resource', 'Resource ID', 'Timestamp',
      'Severity', 'Category', 'Outcome', 'IP Address', 'Device Info'
    ];

    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        event.id,
        event.userId,
        event.action,
        event.resource,
        event.resourceId || '',
        event.timestamp.toISOString(),
        event.severity,
        event.category,
        event.outcome,
        event.ipAddress,
        event.deviceInfo || ''
      ].map(field => `"${field}"`);
      
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  async getAuditStatistics(userId?: string): Promise<{
    totalEvents: number;
    recentEvents: number;
    failureRate: number;
    topActions: { action: string; count: number }[];
    topResources: { resource: string; count: number }[];
  }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const query: AuditQuery = { startDate: oneDayAgo };
      if (userId) query.userId = userId;

      const events = await this.queryAuditLogs(query);
      const allTimeEvents = await this.queryAuditLogs(userId ? { userId } : {});

      const totalEvents = allTimeEvents.length;
      const recentEvents = events.length;
      const failures = events.filter(e => e.outcome === 'failure').length;
      const failureRate = recentEvents > 0 ? (failures / recentEvents) * 100 : 0;

      // Count actions and resources
      const actionCounts: Record<string, number> = {};
      const resourceCounts: Record<string, number> = {};

      events.forEach(event => {
        actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
        resourceCounts[event.resource] = (resourceCounts[event.resource] || 0) + 1;
      });

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      const topResources = Object.entries(resourceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([resource, count]) => ({ resource, count }));

      return {
        totalEvents,
        recentEvents,
        failureRate,
        topActions,
        topResources
      };
    } catch (error) {
      errorHandler.handleError(error, 'getAuditStatistics');
      return {
        totalEvents: 0,
        recentEvents: 0,
        failureRate: 0,
        topActions: [],
        topResources: []
      };
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents();
  }
}

export const auditLogger = new AuditLogger();
