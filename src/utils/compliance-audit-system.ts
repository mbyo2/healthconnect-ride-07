import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { errorHandler } from './error-handler';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface AuditEvent {
  id: string;
  eventType: 'access' | 'modification' | 'deletion' | 'creation' | 'authentication' | 'consent' | 'emergency';
  resourceType: 'patient_data' | 'medical_record' | 'appointment' | 'payment' | 'user_account' | 'system_config';
  resourceId: string;
  userId: string;
  userRole: string;
  action: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  location?: string;
  timestamp: string;
  complianceFlags: ComplianceFlag[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceFlag {
  regulation: 'HIPAA' | 'GDPR' | 'HITECH' | 'SOX' | 'FDA' | 'PIPEDA';
  requirement: string;
  status: 'compliant' | 'violation' | 'warning' | 'review_required';
  description: string;
  remediation?: string;
}

export interface ComplianceReport {
  id: string;
  reportType: 'audit_trail' | 'access_report' | 'breach_report' | 'consent_report' | 'data_retention';
  period: {
    startDate: string;
    endDate: string;
  };
  regulations: string[];
  summary: {
    totalEvents: number;
    violations: number;
    warnings: number;
    compliantEvents: number;
    riskDistribution: Record<string, number>;
  };
  findings: ComplianceFinding[];
  recommendations: string[];
  generatedAt: string;
  generatedBy: string;
  status: 'draft' | 'final' | 'submitted';
}

export interface ComplianceFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  regulation: string;
  requirement: string;
  description: string;
  evidence: string[];
  impact: string;
  remediation: string;
  dueDate?: string;
  assignedTo?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  archiveAfter: number; // days
  deleteAfter: number; // days
  legalHold: boolean;
  regulations: string[];
  lastReviewed: string;
}

class ComplianceAuditSystem {
  private auditBuffer: AuditEvent[] = [];
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  private complianceRules: Map<string, any> = new Map();
  private activeMonitoring: boolean = true;

  constructor() {
    this.initializeComplianceSystem();
  }

  private async initializeComplianceSystem(): Promise<void> {
    try {
      await this.loadRetentionPolicies();
      await this.loadComplianceRules();
      await this.startAuditMonitoring();
      await this.scheduleComplianceReports();

      logger.info('Compliance Audit System initialized', 'COMPLIANCE');
    } catch (error) {
      errorHandler.handleError(error, 'initializeComplianceSystem');
    }
  }

  private async loadRetentionPolicies(): Promise<void> {
    const policies: DataRetentionPolicy[] = [
      {
        dataType: 'medical_records',
        retentionPeriod: 2555, // 7 years
        archiveAfter: 1825, // 5 years
        deleteAfter: 3650, // 10 years
        legalHold: false,
        regulations: ['HIPAA', 'HITECH'],
        lastReviewed: new Date().toISOString()
      },
      {
        dataType: 'audit_logs',
        retentionPeriod: 2190, // 6 years
        archiveAfter: 1095, // 3 years
        deleteAfter: 2555, // 7 years
        legalHold: true,
        regulations: ['HIPAA', 'SOX'],
        lastReviewed: new Date().toISOString()
      },
      {
        dataType: 'consent_records',
        retentionPeriod: 2555, // 7 years
        archiveAfter: 1825, // 5 years
        deleteAfter: 3650, // 10 years
        legalHold: true,
        regulations: ['GDPR', 'HIPAA'],
        lastReviewed: new Date().toISOString()
      },
      {
        dataType: 'payment_data',
        retentionPeriod: 2555, // 7 years
        archiveAfter: 1095, // 3 years
        deleteAfter: 2555, // 7 years
        legalHold: false,
        regulations: ['SOX', 'PCI_DSS'],
        lastReviewed: new Date().toISOString()
      }
    ];

    policies.forEach(policy => {
      this.retentionPolicies.set(policy.dataType, policy);
    });

    logger.info(`Loaded ${this.retentionPolicies.size} data retention policies`, 'COMPLIANCE');
  }

  private async loadComplianceRules(): Promise<void> {
    const rules = {
      'HIPAA_minimum_necessary': {
        regulation: 'HIPAA',
        description: 'Access only minimum necessary PHI',
        check: (event: AuditEvent) => {
          return event.details?.dataScope === 'minimal' || event.details?.justification;
        }
      },
      'GDPR_consent_required': {
        regulation: 'GDPR',
        description: 'Valid consent required for data processing',
        check: (event: AuditEvent) => {
          return event.details?.consentId || event.details?.legalBasis;
        }
      },
      'access_time_restrictions': {
        regulation: 'HIPAA',
        description: 'Access during appropriate business hours',
        check: (event: AuditEvent) => {
          const hour = new Date(event.timestamp).getHours();
          return hour >= 6 && hour <= 22; // 6 AM to 10 PM
        }
      },
      'emergency_access_logging': {
        regulation: 'HIPAA',
        description: 'Emergency access must be properly documented',
        check: (event: AuditEvent) => {
          if (event.details?.emergencyAccess) {
            return event.details?.emergencyJustification && event.details?.supervisorApproval;
          }
          return true;
        }
      }
    };

    Object.entries(rules).forEach(([key, rule]) => {
      this.complianceRules.set(key, rule);
    });
  }

  async logAuditEvent(
    eventType: AuditEvent['eventType'],
    resourceType: AuditEvent['resourceType'],
    resourceId: string,
    userId: string,
    userRole: string,
    action: string,
    details: any = {},
    request?: any
  ): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        resourceType,
        resourceId,
        userId,
        userRole,
        action,
        details,
        ipAddress: this.getClientIP(request),
        userAgent: this.getUserAgent(request),
        location: await this.getLocationFromIP(this.getClientIP(request)),
        timestamp: new Date().toISOString(),
        complianceFlags: [],
        riskLevel: 'low'
      };

      // Perform compliance checks
      auditEvent.complianceFlags = await this.performComplianceChecks(auditEvent);
      auditEvent.riskLevel = this.calculateRiskLevel(auditEvent);

      // Buffer the event
      this.auditBuffer.push(auditEvent);

      // Flush buffer if it's getting full
      if (this.auditBuffer.length >= 100) {
        await this.flushAuditBuffer();
      }

      // Immediate alerts for critical violations
      if (auditEvent.riskLevel === 'critical') {
        await this.sendComplianceAlert(auditEvent);
      }

      logger.debug('Audit event logged', 'COMPLIANCE', {
        eventId: auditEvent.id,
        eventType,
        riskLevel: auditEvent.riskLevel
      });
    } catch (error) {
      errorHandler.handleError(error, 'logAuditEvent');
    }
  }

  private getClientIP(request?: any): string {
    // In production, extract from actual request headers
    return request?.ip || request?.headers?.['x-forwarded-for'] || '127.0.0.1';
  }

  private getUserAgent(request?: any): string {
    return request?.headers?.['user-agent'] || navigator.userAgent || 'Unknown';
  }

  private async getLocationFromIP(ipAddress: string): Promise<string> {
    try {
      // Simplified IP geolocation - in production use actual service
      if (ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.')) {
        return 'Local Network';
      }
      return 'Unknown Location';
    } catch (error) {
      return 'Unknown Location';
    }
  }

  private async performComplianceChecks(event: AuditEvent): Promise<ComplianceFlag[]> {
    const flags: ComplianceFlag[] = [];

    for (const [ruleKey, rule] of this.complianceRules) {
      try {
        const isCompliant = rule.check(event);
        
        if (!isCompliant) {
          flags.push({
            regulation: rule.regulation,
            requirement: ruleKey,
            status: 'violation',
            description: `${rule.description} - Violation detected`,
            remediation: this.getRemediationAdvice(ruleKey)
          });
        } else {
          flags.push({
            regulation: rule.regulation,
            requirement: ruleKey,
            status: 'compliant',
            description: rule.description
          });
        }
      } catch (error) {
        flags.push({
          regulation: rule.regulation,
          requirement: ruleKey,
          status: 'review_required',
          description: `${rule.description} - Unable to verify compliance`,
          remediation: 'Manual review required'
        });
      }
    }

    return flags;
  }

  private getRemediationAdvice(ruleKey: string): string {
    const remediations: Record<string, string> = {
      'HIPAA_minimum_necessary': 'Ensure access is limited to minimum necessary data and document justification',
      'GDPR_consent_required': 'Obtain valid consent or establish legal basis for data processing',
      'access_time_restrictions': 'Access outside business hours requires additional authorization',
      'emergency_access_logging': 'Document emergency justification and obtain supervisor approval'
    };

    return remediations[ruleKey] || 'Review compliance requirements and take corrective action';
  }

  private calculateRiskLevel(event: AuditEvent): AuditEvent['riskLevel'] {
    let riskScore = 0;

    // Check for violations
    const violations = event.complianceFlags.filter(f => f.status === 'violation');
    riskScore += violations.length * 3;

    // Check for warnings
    const warnings = event.complianceFlags.filter(f => f.status === 'warning');
    riskScore += warnings.length * 1;

    // Sensitive resource types increase risk
    if (['patient_data', 'medical_record'].includes(event.resourceType)) {
      riskScore += 2;
    }

    // Administrative actions increase risk
    if (['deletion', 'modification'].includes(event.eventType)) {
      riskScore += 1;
    }

    // Outside business hours increases risk
    const hour = new Date(event.timestamp).getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 1;
    }

    if (riskScore >= 8) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private async flushAuditBuffer(): Promise<void> {
    try {
      if (this.auditBuffer.length === 0) return;

      await supabase.from('audit_events').insert(this.auditBuffer);
      
      logger.info(`Flushed ${this.auditBuffer.length} audit events`, 'COMPLIANCE');
      this.auditBuffer = [];
    } catch (error) {
      logger.error('Failed to flush audit buffer', 'COMPLIANCE', error);
    }
  }

  private async sendComplianceAlert(event: AuditEvent): Promise<void> {
    try {
      const alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'compliance_violation',
        severity: event.riskLevel,
        event_id: event.id,
        violations: event.complianceFlags.filter(f => f.status === 'violation'),
        timestamp: new Date().toISOString()
      };

      await supabase.from('compliance_alerts').insert(alert);

      // Send notifications to compliance team
      await this.notifyComplianceTeam(alert);

      logger.warn('Compliance alert sent', 'COMPLIANCE', {
        alertId: alert.id,
        eventId: event.id,
        severity: event.riskLevel
      });
    } catch (error) {
      logger.error('Failed to send compliance alert', 'COMPLIANCE', error);
    }
  }

  private async notifyComplianceTeam(alert: any): Promise<void> {
    try {
      // Get compliance team members
      const { data: complianceTeam } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'compliance_officer');

      if (complianceTeam) {
        for (const member of complianceTeam) {
          await supabase.from('notifications').insert({
            recipient_id: member.user_id,
            type: 'compliance_alert',
            title: `Compliance Violation - ${alert.severity.toUpperCase()}`,
            message: `Critical compliance violation detected. Alert ID: ${alert.id}`,
            data: JSON.stringify(alert),
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      logger.error('Failed to notify compliance team', 'COMPLIANCE', error);
    }
  }

  async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    startDate: string,
    endDate: string,
    regulations: string[] = ['HIPAA', 'GDPR'],
    generatedBy: string
  ): Promise<ComplianceReport> {
    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get audit events for the period
      const { data: events } = await supabase
        .from('audit_events')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (!events) {
        throw new Error('No audit events found for the specified period');
      }

      // Analyze events
      const summary = this.analyzeEvents(events);
      const findings = await this.identifyFindings(events, regulations);
      const recommendations = this.generateRecommendations(findings);

      const report: ComplianceReport = {
        id: reportId,
        reportType,
        period: { startDate, endDate },
        regulations,
        summary,
        findings,
        recommendations,
        generatedAt: new Date().toISOString(),
        generatedBy,
        status: 'draft'
      };

      // Store report
      await supabase.from('compliance_reports').insert({
        id: reportId,
        report_data: JSON.stringify(report),
        created_at: new Date().toISOString()
      });

      logger.info('Compliance report generated', 'COMPLIANCE', {
        reportId,
        reportType,
        period: `${startDate} to ${endDate}`,
        totalEvents: summary.totalEvents
      });

      return report;
    } catch (error) {
      errorHandler.handleError(error, 'generateComplianceReport');
      throw error;
    }
  }

  private analyzeEvents(events: AuditEvent[]): ComplianceReport['summary'] {
    const summary = {
      totalEvents: events.length,
      violations: 0,
      warnings: 0,
      compliantEvents: 0,
      riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
    };

    events.forEach(event => {
      // Count violations and warnings
      const violations = event.complianceFlags?.filter(f => f.status === 'violation') || [];
      const warnings = event.complianceFlags?.filter(f => f.status === 'warning') || [];

      if (violations.length > 0) {
        summary.violations++;
      } else if (warnings.length > 0) {
        summary.warnings++;
      } else {
        summary.compliantEvents++;
      }

      // Risk distribution
      summary.riskDistribution[event.riskLevel || 'low']++;
    });

    return summary;
  }

  private async identifyFindings(events: AuditEvent[], regulations: string[]): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    const violationGroups = new Map<string, AuditEvent[]>();

    // Group violations by type
    events.forEach(event => {
      event.complianceFlags?.forEach(flag => {
        if (flag.status === 'violation' && regulations.includes(flag.regulation)) {
          const key = `${flag.regulation}_${flag.requirement}`;
          if (!violationGroups.has(key)) {
            violationGroups.set(key, []);
          }
          violationGroups.get(key)!.push(event);
        }
      });
    });

    // Create findings for each violation group
    violationGroups.forEach((violationEvents, key) => {
      const [regulation, requirement] = key.split('_', 2);
      const severity = this.determineFindingSeverity(violationEvents);
      
      findings.push({
        id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        severity,
        regulation,
        requirement,
        description: `${violationEvents.length} violations of ${requirement} requirement`,
        evidence: violationEvents.map(e => e.id),
        impact: this.assessImpact(violationEvents),
        remediation: this.getRemediationAdvice(requirement),
        status: 'open'
      });
    });

    return findings;
  }

  private determineFindingSeverity(events: AuditEvent[]): ComplianceFinding['severity'] {
    const criticalCount = events.filter(e => e.riskLevel === 'critical').length;
    const highCount = events.filter(e => e.riskLevel === 'high').length;

    if (criticalCount > 0 || events.length > 10) return 'critical';
    if (highCount > 0 || events.length > 5) return 'high';
    if (events.length > 2) return 'medium';
    return 'low';
  }

  private assessImpact(events: AuditEvent[]): string {
    const patientDataEvents = events.filter(e => e.resourceType === 'patient_data').length;
    const medicalRecordEvents = events.filter(e => e.resourceType === 'medical_record').length;

    if (patientDataEvents > 0 || medicalRecordEvents > 0) {
      return 'Potential unauthorized access to protected health information (PHI)';
    }

    return 'Compliance violation with potential regulatory implications';
  }

  private generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations = new Set<string>();

    findings.forEach(finding => {
      switch (finding.severity) {
        case 'critical':
          recommendations.add('Immediate investigation and remediation required');
          recommendations.add('Consider breach notification requirements');
          break;
        case 'high':
          recommendations.add('Priority remediation within 24-48 hours');
          recommendations.add('Review and strengthen access controls');
          break;
        case 'medium':
          recommendations.add('Address within one week');
          recommendations.add('Enhance staff training on compliance requirements');
          break;
        case 'low':
          recommendations.add('Include in next compliance review cycle');
          break;
      }

      if (finding.regulation === 'HIPAA') {
        recommendations.add('Review HIPAA policies and procedures');
      }
      if (finding.regulation === 'GDPR') {
        recommendations.add('Verify consent management processes');
      }
    });

    // General recommendations
    recommendations.add('Implement regular compliance monitoring');
    recommendations.add('Conduct periodic risk assessments');
    recommendations.add('Maintain comprehensive audit trails');

    return Array.from(recommendations);
  }

  async performDataRetentionCleanup(): Promise<void> {
    try {
      let cleanupCount = 0;

      for (const [dataType, policy] of this.retentionPolicies) {
        if (policy.legalHold) {
          logger.info(`Skipping cleanup for ${dataType} - legal hold active`, 'COMPLIANCE');
          continue;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.deleteAfter);

        // Archive old data
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - policy.archiveAfter);

        await this.archiveOldData(dataType, archiveDate);

        // Delete expired data
        const deleteCount = await this.deleteExpiredData(dataType, cutoffDate);
        cleanupCount += deleteCount;
      }

      logger.info(`Data retention cleanup completed: ${cleanupCount} records processed`, 'COMPLIANCE');
    } catch (error) {
      errorHandler.handleError(error, 'performDataRetentionCleanup');
    }
  }

  private async archiveOldData(dataType: string, archiveDate: Date): Promise<void> {
    try {
      const tableName = this.getTableName(dataType);
      
      // Move old data to archive table
      const { data: oldData } = await supabase
        .from(tableName)
        .select('*')
        .lt('created_at', archiveDate.toISOString())
        .eq('archived', false);

      if (oldData && oldData.length > 0) {
        // Insert into archive table
        await supabase.from(`${tableName}_archive`).insert(
          oldData.map(record => ({ ...record, archived_at: new Date().toISOString() }))
        );

        // Mark as archived in original table
        await supabase
          .from(tableName)
          .update({ archived: true, archived_at: new Date().toISOString() })
          .lt('created_at', archiveDate.toISOString());

        logger.info(`Archived ${oldData.length} ${dataType} records`, 'COMPLIANCE');
      }
    } catch (error) {
      logger.error(`Failed to archive ${dataType} data`, 'COMPLIANCE', error);
    }
  }

  private async deleteExpiredData(dataType: string, cutoffDate: Date): Promise<number> {
    try {
      const tableName = this.getTableName(dataType);
      
      const { count } = await supabase
        .from(tableName)
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('archived', true);

      if (count && count > 0) {
        logger.info(`Deleted ${count} expired ${dataType} records`, 'COMPLIANCE');
      }

      return count || 0;
    } catch (error) {
      logger.error(`Failed to delete expired ${dataType} data`, 'COMPLIANCE', error);
      return 0;
    }
  }

  private getTableName(dataType: string): string {
    const tableMap: Record<string, string> = {
      'medical_records': 'medical_records',
      'audit_logs': 'audit_events',
      'consent_records': 'consent_records',
      'payment_data': 'payments'
    };

    return tableMap[dataType] || dataType;
  }

  private async startAuditMonitoring(): Promise<void> {
    // Flush audit buffer every 5 minutes
    setInterval(async () => {
      await this.flushAuditBuffer();
    }, 5 * 60 * 1000);

    // Daily compliance checks
    setInterval(async () => {
      await this.performDailyComplianceCheck();
    }, 24 * 60 * 60 * 1000);

    logger.info('Audit monitoring started', 'COMPLIANCE');
  }

  private async scheduleComplianceReports(): Promise<void> {
    // Weekly compliance reports
    setInterval(async () => {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      await this.generateComplianceReport('audit_trail', startDate, endDate, ['HIPAA', 'GDPR'], 'system');
    }, 7 * 24 * 60 * 60 * 1000);

    // Monthly data retention cleanup
    setInterval(async () => {
      await this.performDataRetentionCleanup();
    }, 30 * 24 * 60 * 60 * 1000);
  }

  private async performDailyComplianceCheck(): Promise<void> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const today = new Date().toISOString();

      const { data: events } = await supabase
        .from('audit_events')
        .select('*')
        .gte('timestamp', yesterday)
        .lt('timestamp', today)
        .eq('riskLevel', 'critical');

      if (events && events.length > 0) {
        logger.warn(`Daily compliance check: ${events.length} critical events found`, 'COMPLIANCE');
        
        // Generate immediate report for critical events
        await this.generateComplianceReport('breach_report', yesterday, today, ['HIPAA', 'GDPR'], 'system');
      }
    } catch (error) {
      logger.error('Daily compliance check failed', 'COMPLIANCE', error);
    }
  }

  async getComplianceStatus(): Promise<any> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentEvents } = await supabase
        .from('audit_events')
        .select('*')
        .gte('timestamp', last30Days);

      if (!recentEvents) {
        return { status: 'unknown', message: 'No recent audit data available' };
      }

      const summary = this.analyzeEvents(recentEvents);
      const complianceRate = (summary.compliantEvents / summary.totalEvents) * 100;

      let status: string;
      if (complianceRate >= 95) status = 'excellent';
      else if (complianceRate >= 90) status = 'good';
      else if (complianceRate >= 80) status = 'fair';
      else status = 'poor';

      return {
        status,
        complianceRate: Math.round(complianceRate),
        summary,
        period: '30 days',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      errorHandler.handleError(error, 'getComplianceStatus');
      return { status: 'error', message: 'Failed to retrieve compliance status' };
    }
  }

  cleanup(): void {
    this.activeMonitoring = false;
    this.flushAuditBuffer();
  }
}

export const complianceAuditSystem = new ComplianceAuditSystem();
