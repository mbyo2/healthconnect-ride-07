import { createClient } from '@supabase/supabase-js';
import { errorHandler } from './error-handler';
import { logger } from './logger';
import { fraudDetectionEngine } from './fraud-detection';
import { auditLogger } from './audit-logger';
import { performanceMonitor } from './performance-monitor';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface SecurityMetrics {
  totalUsers: number;
  activeUsers: number;
  activeSessions: number;
  fraudAlerts: number;
  criticalAlerts: number;
  successfulLogins: number;
  failedLogins: number;
  biometricLogins: number;
  twoFactorEnabled: number;
  suspiciousActivities: number;
  blockedTransactions: number;
  averageRiskScore: number;
}

export interface ThreatIntelligence {
  ipReputationData: IPReputation[];
  attackPatterns: AttackPattern[];
  vulnerabilityAlerts: VulnerabilityAlert[];
  threatIndicators: ThreatIndicator[];
}

export interface IPReputation {
  ipAddress: string;
  reputation: 'clean' | 'suspicious' | 'malicious';
  confidence: number;
  lastSeen: Date;
  attackTypes: string[];
  geolocation: string;
}

export interface AttackPattern {
  pattern: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
  lastDetected: Date;
}

export interface VulnerabilityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSystems: string[];
  patchAvailable: boolean;
  cveId?: string;
  discoveredAt: Date;
}

export interface ThreatIndicator {
  type: 'ip' | 'domain' | 'hash' | 'pattern';
  value: string;
  confidence: number;
  source: string;
  description: string;
  createdAt: Date;
}

export interface SecurityReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance';
  title: string;
  summary: string;
  metrics: SecurityMetrics;
  threats: ThreatIntelligence;
  recommendations: string[];
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  factors: RiskFactor[];
  mitigation: string[];
  nextReview: Date;
}

export interface RiskFactor {
  category: string;
  description: string;
  impact: number;
  likelihood: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityAnalytics {
  private reportCache: Map<string, SecurityReport> = new Map();
  private metricsCache: SecurityMetrics | null = null;
  private cacheExpiry: number = 300000; // 5 minutes

  async getSecurityMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<SecurityMetrics> {
    try {
      // Check cache
      if (this.metricsCache && Date.now() - (this.metricsCache as any).cachedAt < this.cacheExpiry) {
        return this.metricsCache;
      }

      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRangeMs[timeRange]).toISOString();

      // Get user metrics
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('last_activity', since);

      const { count: activeSessions } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get security event metrics
      const { count: fraudAlerts } = await supabase
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);

      const { count: criticalAlerts } = await supabase
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .eq('resolved', false);

      const { count: successfulLogins } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'login')
        .gte('timestamp', since);

      const { count: failedLogins } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'failed_login')
        .gte('timestamp', since);

      const { count: biometricLogins } = await supabase
        .from('user_biometric_credentials')
        .select('*', { count: 'exact', head: true })
        .gte('last_used', since);

      const { count: twoFactorEnabled } = await supabase
        .from('user_two_factor')
        .select('*', { count: 'exact', head: true })
        .eq('enabled', true);

      const { count: suspiciousActivities } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'suspicious_activity')
        .gte('timestamp', since);

      // Calculate average risk score
      const { data: riskScores } = await supabase
        .from('fraud_alerts')
        .select('risk_score')
        .gte('created_at', since);

      const averageRiskScore = riskScores?.length 
        ? riskScores.reduce((sum, alert) => sum + alert.risk_score, 0) / riskScores.length
        : 0;

      const metrics: SecurityMetrics = {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        activeSessions: activeSessions || 0,
        fraudAlerts: fraudAlerts || 0,
        criticalAlerts: criticalAlerts || 0,
        successfulLogins: successfulLogins || 0,
        failedLogins: failedLogins || 0,
        biometricLogins: biometricLogins || 0,
        twoFactorEnabled: twoFactorEnabled || 0,
        suspiciousActivities: suspiciousActivities || 0,
        blockedTransactions: 0, // Would be calculated from payment data
        averageRiskScore: Math.round(averageRiskScore)
      };

      // Cache metrics
      this.metricsCache = { ...metrics, cachedAt: Date.now() } as any;

      logger.info('Security metrics calculated', 'SECURITY_ANALYTICS', { timeRange });
      return metrics;
    } catch (error) {
      errorHandler.handleError(error, 'getSecurityMetrics');
      return {
        totalUsers: 0,
        activeUsers: 0,
        activeSessions: 0,
        fraudAlerts: 0,
        criticalAlerts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        biometricLogins: 0,
        twoFactorEnabled: 0,
        suspiciousActivities: 0,
        blockedTransactions: 0,
        averageRiskScore: 0
      };
    }
  }

  async generateSecurityReport(
    type: SecurityReport['type'],
    startDate: Date,
    endDate: Date
  ): Promise<SecurityReport> {
    try {
      const reportId = `${type}-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      
      // Check cache
      if (this.reportCache.has(reportId)) {
        return this.reportCache.get(reportId)!;
      }

      logger.info('Generating security report', 'SECURITY_ANALYTICS', { type, startDate, endDate });

      // Get metrics for the period
      const metrics = await this.getSecurityMetrics('30d'); // Use 30d as base
      
      // Get threat intelligence
      const threats = await this.getThreatIntelligence(startDate, endDate);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(metrics, threats);

      const report: SecurityReport = {
        id: reportId,
        type,
        title: this.getReportTitle(type, startDate, endDate),
        summary: this.generateReportSummary(metrics, threats),
        metrics,
        threats,
        recommendations,
        generatedAt: new Date(),
        period: { start: startDate, end: endDate }
      };

      // Cache report
      this.reportCache.set(reportId, report);

      // Store in database
      await this.storeReport(report);

      logger.info('Security report generated', 'SECURITY_ANALYTICS', { reportId, type });
      return report;
    } catch (error) {
      errorHandler.handleError(error, 'generateSecurityReport');
      throw error;
    }
  }

  private async getThreatIntelligence(startDate: Date, endDate: Date): Promise<ThreatIntelligence> {
    try {
      // Get IP reputation data
      const ipReputationData = await this.getIPReputationData(startDate, endDate);
      
      // Analyze attack patterns
      const attackPatterns = await this.analyzeAttackPatterns(startDate, endDate);
      
      // Get vulnerability alerts
      const vulnerabilityAlerts = await this.getVulnerabilityAlerts();
      
      // Generate threat indicators
      const threatIndicators = await this.generateThreatIndicators(startDate, endDate);

      return {
        ipReputationData,
        attackPatterns,
        vulnerabilityAlerts,
        threatIndicators
      };
    } catch (error) {
      logger.error('Error getting threat intelligence', 'SECURITY_ANALYTICS', error);
      return {
        ipReputationData: [],
        attackPatterns: [],
        vulnerabilityAlerts: [],
        threatIndicators: []
      };
    }
  }

  private async getIPReputationData(startDate: Date, endDate: Date): Promise<IPReputation[]> {
    try {
      // Get unique IP addresses from security events
      const { data: securityEvents } = await supabase
        .from('security_events')
        .select('ip_address')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      const uniqueIPs = [...new Set(securityEvents?.map(e => e.ip_address) || [])];
      
      // In production, integrate with IP reputation services
      return uniqueIPs.map(ip => ({
        ipAddress: ip,
        reputation: 'clean' as const,
        confidence: 0.8,
        lastSeen: new Date(),
        attackTypes: [],
        geolocation: 'Unknown'
      }));
    } catch (error) {
      logger.error('Error getting IP reputation data', 'SECURITY_ANALYTICS', error);
      return [];
    }
  }

  private async analyzeAttackPatterns(startDate: Date, endDate: Date): Promise<AttackPattern[]> {
    try {
      const { data: suspiciousEvents } = await supabase
        .from('security_events')
        .select('*')
        .eq('type', 'suspicious_activity')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      // Analyze patterns in suspicious activities
      const patterns: Record<string, number> = {};
      
      suspiciousEvents?.forEach(event => {
        const pattern = this.extractPattern(event.details);
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      });

      return Object.entries(patterns).map(([pattern, frequency]) => ({
        pattern,
        frequency,
        severity: frequency > 10 ? 'high' : frequency > 5 ? 'medium' : 'low' as const,
        description: `Pattern detected in ${frequency} events`,
        mitigation: this.getMitigationForPattern(pattern),
        lastDetected: new Date()
      }));
    } catch (error) {
      logger.error('Error analyzing attack patterns', 'SECURITY_ANALYTICS', error);
      return [];
    }
  }

  private extractPattern(details: any): string {
    // Simple pattern extraction - in production, use ML/AI
    if (details?.type === 'velocity') return 'High velocity attacks';
    if (details?.type === 'location') return 'Unusual location access';
    if (details?.type === 'device') return 'New device access';
    return 'Unknown pattern';
  }

  private getMitigationForPattern(pattern: string): string {
    const mitigations: Record<string, string> = {
      'High velocity attacks': 'Implement rate limiting and CAPTCHA',
      'Unusual location access': 'Enable location-based authentication',
      'New device access': 'Require device verification',
      'Unknown pattern': 'Monitor and investigate further'
    };
    return mitigations[pattern] || 'General security monitoring';
  }

  private async getVulnerabilityAlerts(): Promise<VulnerabilityAlert[]> {
    try {
      // In production, integrate with vulnerability databases
      return [
        {
          id: 'vuln-001',
          type: 'Dependency Vulnerability',
          severity: 'medium',
          description: 'Outdated JavaScript dependencies detected',
          affectedSystems: ['Web Application'],
          patchAvailable: true,
          discoveredAt: new Date()
        }
      ];
    } catch (error) {
      logger.error('Error getting vulnerability alerts', 'SECURITY_ANALYTICS', error);
      return [];
    }
  }

  private async generateThreatIndicators(startDate: Date, endDate: Date): Promise<ThreatIndicator[]> {
    try {
      const indicators: ThreatIndicator[] = [];
      
      // Get suspicious IPs
      const { data: suspiciousIPs } = await supabase
        .from('security_events')
        .select('ip_address')
        .eq('type', 'suspicious_activity')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      const uniqueSuspiciousIPs = [...new Set(suspiciousIPs?.map(e => e.ip_address) || [])];
      
      uniqueSuspiciousIPs.forEach(ip => {
        indicators.push({
          type: 'ip',
          value: ip,
          confidence: 0.7,
          source: 'Internal Detection',
          description: 'IP associated with suspicious activity',
          createdAt: new Date()
        });
      });

      return indicators;
    } catch (error) {
      logger.error('Error generating threat indicators', 'SECURITY_ANALYTICS', error);
      return [];
    }
  }

  private async generateRecommendations(metrics: SecurityMetrics, threats: ThreatIntelligence): Promise<string[]> {
    const recommendations: string[] = [];

    // Authentication recommendations
    if (metrics.twoFactorEnabled < metrics.totalUsers * 0.8) {
      recommendations.push('Encourage more users to enable two-factor authentication');
    }

    if (metrics.failedLogins > metrics.successfulLogins * 0.1) {
      recommendations.push('High failed login rate detected - consider implementing account lockout policies');
    }

    // Security recommendations
    if (metrics.criticalAlerts > 0) {
      recommendations.push('Address critical security alerts immediately');
    }

    if (metrics.suspiciousActivities > 10) {
      recommendations.push('High suspicious activity detected - review security monitoring rules');
    }

    // Threat-based recommendations
    if (threats.attackPatterns.some(p => p.severity === 'high')) {
      recommendations.push('High-severity attack patterns detected - implement additional security controls');
    }

    if (threats.vulnerabilityAlerts.some(v => v.severity === 'critical')) {
      recommendations.push('Critical vulnerabilities found - apply patches immediately');
    }

    // Performance recommendations
    if (metrics.averageRiskScore > 60) {
      recommendations.push('Average risk score is high - review fraud detection thresholds');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture appears healthy - continue monitoring');
    }

    return recommendations;
  }

  private getReportTitle(type: SecurityReport['type'], startDate: Date, endDate: Date): string {
    const period = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    const titles = {
      daily: `Daily Security Report - ${period}`,
      weekly: `Weekly Security Report - ${period}`,
      monthly: `Monthly Security Report - ${period}`,
      incident: `Security Incident Report - ${period}`,
      compliance: `Compliance Report - ${period}`
    };
    return titles[type];
  }

  private generateReportSummary(metrics: SecurityMetrics, threats: ThreatIntelligence): string {
    const criticalIssues = metrics.criticalAlerts + threats.vulnerabilityAlerts.filter(v => v.severity === 'critical').length;
    const highSeverityThreats = threats.attackPatterns.filter(p => p.severity === 'high').length;
    
    if (criticalIssues > 0) {
      return `Critical security issues detected requiring immediate attention. ${criticalIssues} critical alerts and ${highSeverityThreats} high-severity threats identified.`;
    } else if (metrics.suspiciousActivities > 20) {
      return `Elevated suspicious activity detected with ${metrics.suspiciousActivities} events. Monitoring and investigation recommended.`;
    } else {
      return `Security posture appears stable with ${metrics.fraudAlerts} fraud alerts and ${metrics.suspiciousActivities} suspicious activities detected.`;
    }
  }

  private async storeReport(report: SecurityReport): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_reports')
        .insert({
          id: report.id,
          type: report.type,
          title: report.title,
          summary: report.summary,
          metrics: report.metrics,
          threats: report.threats,
          recommendations: report.recommendations,
          generated_at: report.generatedAt.toISOString(),
          period_start: report.period.start.toISOString(),
          period_end: report.period.end.toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error storing security report', 'SECURITY_ANALYTICS', error);
    }
  }

  async performRiskAssessment(): Promise<RiskAssessment> {
    try {
      const metrics = await this.getSecurityMetrics('30d');
      const threats = await this.getThreatIntelligence(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      const factors: RiskFactor[] = [];
      let totalRisk = 0;

      // Authentication risk factors
      if (metrics.twoFactorEnabled < metrics.totalUsers * 0.5) {
        factors.push({
          category: 'Authentication',
          description: 'Low two-factor authentication adoption',
          impact: 7,
          likelihood: 8,
          riskLevel: 'high'
        });
        totalRisk += 56; // impact * likelihood
      }

      // Security incident risk factors
      if (metrics.criticalAlerts > 0) {
        factors.push({
          category: 'Security Incidents',
          description: 'Unresolved critical security alerts',
          impact: 9,
          likelihood: 9,
          riskLevel: 'critical'
        });
        totalRisk += 81;
      }

      // Fraud risk factors
      if (metrics.averageRiskScore > 70) {
        factors.push({
          category: 'Fraud',
          description: 'High average fraud risk score',
          impact: 8,
          likelihood: 7,
          riskLevel: 'high'
        });
        totalRisk += 56;
      }

      // Vulnerability risk factors
      const criticalVulns = threats.vulnerabilityAlerts.filter(v => v.severity === 'critical').length;
      if (criticalVulns > 0) {
        factors.push({
          category: 'Vulnerabilities',
          description: `${criticalVulns} critical vulnerabilities detected`,
          impact: 9,
          likelihood: 8,
          riskLevel: 'critical'
        });
        totalRisk += 72;
      }

      // Calculate overall risk
      const maxPossibleRisk = factors.length * 81; // 9 * 9
      const riskScore = maxPossibleRisk > 0 ? (totalRisk / maxPossibleRisk) * 100 : 0;

      let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (riskScore >= 75) overallRisk = 'critical';
      else if (riskScore >= 50) overallRisk = 'high';
      else if (riskScore >= 25) overallRisk = 'medium';

      const mitigation = this.generateMitigationStrategies(factors);

      return {
        overallRisk,
        riskScore: Math.round(riskScore),
        factors,
        mitigation,
        nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
    } catch (error) {
      errorHandler.handleError(error, 'performRiskAssessment');
      return {
        overallRisk: 'medium',
        riskScore: 50,
        factors: [],
        mitigation: ['Error performing risk assessment'],
        nextReview: new Date()
      };
    }
  }

  private generateMitigationStrategies(factors: RiskFactor[]): string[] {
    const strategies: string[] = [];

    factors.forEach(factor => {
      switch (factor.category) {
        case 'Authentication':
          strategies.push('Implement mandatory 2FA for high-risk users');
          strategies.push('Provide user education on authentication security');
          break;
        case 'Security Incidents':
          strategies.push('Establish incident response procedures');
          strategies.push('Implement automated alert escalation');
          break;
        case 'Fraud':
          strategies.push('Review and tune fraud detection algorithms');
          strategies.push('Implement additional transaction monitoring');
          break;
        case 'Vulnerabilities':
          strategies.push('Establish regular vulnerability scanning');
          strategies.push('Implement automated patch management');
          break;
      }
    });

    return [...new Set(strategies)]; // Remove duplicates
  }

  async getSecurityTrends(days: number = 30): Promise<{
    loginTrends: { date: string; successful: number; failed: number }[];
    fraudTrends: { date: string; alerts: number; riskScore: number }[];
    performanceTrends: { date: string; responseTime: number; errorRate: number }[];
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // This would typically involve more complex queries and data aggregation
      // For now, returning sample structure
      return {
        loginTrends: [],
        fraudTrends: [],
        performanceTrends: []
      };
    } catch (error) {
      errorHandler.handleError(error, 'getSecurityTrends');
      return {
        loginTrends: [],
        fraudTrends: [],
        performanceTrends: []
      };
    }
  }

  clearCache(): void {
    this.reportCache.clear();
    this.metricsCache = null;
  }
}

export const securityAnalytics = new SecurityAnalytics();
