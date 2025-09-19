import { createClient } from '@supabase/supabase-js';
import { errorHandler } from './error-handler';
import { logger } from './logger';
import { securityNotificationService } from './security-notifications';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface FraudRiskScore {
  score: number; // 0-100, higher = more suspicious
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

export interface TransactionPattern {
  userId: string;
  averageAmount: number;
  frequencyPattern: number[];
  timePattern: number[];
  locationPattern: string[];
  devicePattern: string[];
}

export interface FraudAlert {
  id: string;
  userId: string;
  type: 'velocity' | 'amount' | 'location' | 'device' | 'behavioral' | 'ml_prediction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  riskScore: number;
  metadata: Record<string, any>;
  createdAt: Date;
  resolved: boolean;
}

class FraudDetectionEngine {
  private readonly VELOCITY_THRESHOLD = 5; // transactions per hour
  private readonly AMOUNT_MULTIPLIER_THRESHOLD = 10; // 10x average amount
  private readonly LOCATION_DISTANCE_THRESHOLD = 1000; // km
  private readonly DEVICE_CHANGE_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

  async analyzeTransaction(
    userId: string,
    amount: number,
    location?: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<FraudRiskScore> {
    try {
      logger.info('Analyzing transaction for fraud', 'FRAUD_DETECTION', { userId, amount });

      const factors: string[] = [];
      let riskScore = 0;

      // Get user's transaction history and patterns
      const userPattern = await this.getUserTransactionPattern(userId);
      
      // 1. Velocity Analysis
      const velocityRisk = await this.analyzeVelocity(userId);
      riskScore += velocityRisk.score;
      if (velocityRisk.isSuspicious) {
        factors.push(`High transaction velocity: ${velocityRisk.count} transactions in last hour`);
      }

      // 2. Amount Analysis
      const amountRisk = this.analyzeAmount(amount, userPattern.averageAmount);
      riskScore += amountRisk.score;
      if (amountRisk.isSuspicious) {
        factors.push(`Unusual amount: ${amount} vs average ${userPattern.averageAmount}`);
      }

      // 3. Location Analysis
      if (location) {
        const locationRisk = await this.analyzeLocation(userId, location);
        riskScore += locationRisk.score;
        if (locationRisk.isSuspicious) {
          factors.push(`Unusual location: ${location}`);
        }
      }

      // 4. Device Analysis
      if (deviceInfo) {
        const deviceRisk = await this.analyzeDevice(userId, deviceInfo);
        riskScore += deviceRisk.score;
        if (deviceRisk.isSuspicious) {
          factors.push(`New or unusual device: ${deviceInfo}`);
        }
      }

      // 5. Time Pattern Analysis
      const timeRisk = this.analyzeTimePattern(userPattern.timePattern);
      riskScore += timeRisk.score;
      if (timeRisk.isSuspicious) {
        factors.push('Transaction at unusual time');
      }

      // 6. Behavioral Analysis
      const behaviorRisk = await this.analyzeBehavioralPatterns(userId);
      riskScore += behaviorRisk.score;
      if (behaviorRisk.isSuspicious) {
        factors.push('Unusual behavioral pattern detected');
      }

      // 7. IP Address Analysis
      if (ipAddress) {
        const ipRisk = await this.analyzeIPAddress(userId, ipAddress);
        riskScore += ipRisk.score;
        if (ipRisk.isSuspicious) {
          factors.push(`Suspicious IP address: ${ipAddress}`);
        }
      }

      // Normalize score to 0-100
      riskScore = Math.min(100, riskScore);

      const level = this.getRiskLevel(riskScore);
      const recommendations = this.getRecommendations(level, factors);

      // Create fraud alert if high risk
      if (level === 'high' || level === 'critical') {
        await this.createFraudAlert(userId, 'ml_prediction', level, 
          `High fraud risk detected (score: ${riskScore})`, riskScore, {
            factors,
            amount,
            location,
            deviceInfo,
            ipAddress
          });
      }

      logger.info('Fraud analysis completed', 'FRAUD_DETECTION', { 
        userId, 
        riskScore, 
        level, 
        factorCount: factors.length 
      });

      return {
        score: riskScore,
        level,
        factors,
        recommendations
      };

    } catch (error) {
      errorHandler.handleError(error, 'analyzeTransaction');
      // Return safe default on error
      return {
        score: 50,
        level: 'medium',
        factors: ['Error during fraud analysis'],
        recommendations: ['Manual review required']
      };
    }
  }

  private async analyzeVelocity(userId: string): Promise<{ score: number; isSuspicious: boolean; count: number }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', userId)
      .gte('created_at', oneHourAgo);

    if (error) {
      logger.error('Error analyzing velocity', 'FRAUD_DETECTION', error);
      return { score: 0, isSuspicious: false, count: 0 };
    }

    const transactionCount = count || 0;
    const isSuspicious = transactionCount > this.VELOCITY_THRESHOLD;
    const score = Math.min(30, transactionCount * 5); // Max 30 points

    return { score, isSuspicious, count: transactionCount };
  }

  private analyzeAmount(amount: number, averageAmount: number): { score: number; isSuspicious: boolean } {
    if (averageAmount === 0) return { score: 0, isSuspicious: false };

    const multiplier = amount / averageAmount;
    const isSuspicious = multiplier > this.AMOUNT_MULTIPLIER_THRESHOLD;
    const score = Math.min(25, Math.log10(multiplier) * 10); // Max 25 points

    return { score, isSuspicious };
  }

  private async analyzeLocation(userId: string, currentLocation: string): Promise<{ score: number; isSuspicious: boolean }> {
    try {
      const { data: recentLocations, error } = await supabase
        .from('user_sessions')
        .select('location')
        .eq('user_id', userId)
        .not('location', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !recentLocations?.length) {
        return { score: 0, isSuspicious: false };
      }

      const uniqueLocations = [...new Set(recentLocations.map(l => l.location))];
      const isNewLocation = !uniqueLocations.includes(currentLocation);
      
      // Simple location analysis - in production, use geolocation distance
      const score = isNewLocation ? 20 : 0;
      
      return { score, isSuspicious: isNewLocation };

    } catch (error) {
      logger.error('Error analyzing location', 'FRAUD_DETECTION', error);
      return { score: 0, isSuspicious: false };
    }
  }

  private async analyzeDevice(userId: string, currentDevice: string): Promise<{ score: number; isSuspicious: boolean }> {
    try {
      const recentDeviceWindow = new Date(Date.now() - this.DEVICE_CHANGE_WINDOW).toISOString();
      
      const { data: recentDevices, error } = await supabase
        .from('user_sessions')
        .select('device_info')
        .eq('user_id', userId)
        .gte('created_at', recentDeviceWindow)
        .order('created_at', { ascending: false });

      if (error || !recentDevices?.length) {
        return { score: 15, isSuspicious: true }; // New user or no history
      }

      const uniqueDevices = [...new Set(recentDevices.map(d => d.device_info))];
      const isNewDevice = !uniqueDevices.includes(currentDevice);
      
      const score = isNewDevice ? 15 : 0;
      
      return { score, isSuspicious: isNewDevice };

    } catch (error) {
      logger.error('Error analyzing device', 'FRAUD_DETECTION', error);
      return { score: 0, isSuspicious: false };
    }
  }

  private analyzeTimePattern(timePattern: number[]): { score: number; isSuspicious: boolean } {
    const currentHour = new Date().getHours();
    
    if (timePattern.length === 0) {
      return { score: 5, isSuspicious: true }; // No pattern available
    }

    // Check if current hour is in user's typical pattern
    const hourFrequency = timePattern[currentHour] || 0;
    const averageFrequency = timePattern.reduce((a, b) => a + b, 0) / timePattern.length;
    
    const isUnusualTime = hourFrequency < averageFrequency * 0.1; // Less than 10% of average
    const score = isUnusualTime ? 10 : 0;

    return { score, isSuspicious: isUnusualTime };
  }

  private async analyzeBehavioralPatterns(userId: string): Promise<{ score: number; isSuspicious: boolean }> {
    try {
      // Analyze user's behavioral patterns over the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentActivity, error } = await supabase
        .from('security_events')
        .select('type, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', thirtyDaysAgo)
        .order('timestamp', { ascending: false });

      if (error || !recentActivity?.length) {
        return { score: 0, isSuspicious: false };
      }

      // Look for unusual patterns
      const eventTypes = recentActivity.map(e => e.type);
      const suspiciousEvents = eventTypes.filter(type => 
        type === 'suspicious_activity' || type === 'login'
      ).length;

      const suspiciousRatio = suspiciousEvents / recentActivity.length;
      const isSuspicious = suspiciousRatio > 0.3; // More than 30% suspicious events
      const score = Math.min(20, suspiciousRatio * 50);

      return { score, isSuspicious };

    } catch (error) {
      logger.error('Error analyzing behavioral patterns', 'FRAUD_DETECTION', error);
      return { score: 0, isSuspicious: false };
    }
  }

  private async analyzeIPAddress(userId: string, ipAddress: string): Promise<{ score: number; isSuspicious: boolean }> {
    try {
      // Check against known IP addresses for this user
      const { data: knownIPs, error } = await supabase
        .from('user_sessions')
        .select('ip_address')
        .eq('user_id', userId)
        .not('ip_address', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return { score: 0, isSuspicious: false };
      }

      const uniqueIPs = [...new Set(knownIPs?.map(s => s.ip_address) || [])];
      const isNewIP = !uniqueIPs.includes(ipAddress);

      // In production, integrate with IP reputation services
      const isKnownMaliciousIP = this.checkIPReputation(ipAddress);
      
      let score = 0;
      let isSuspicious = false;

      if (isNewIP) {
        score += 10;
        isSuspicious = true;
      }

      if (isKnownMaliciousIP) {
        score += 30;
        isSuspicious = true;
      }

      return { score, isSuspicious };

    } catch (error) {
      logger.error('Error analyzing IP address', 'FRAUD_DETECTION', error);
      return { score: 0, isSuspicious: false };
    }
  }

  private checkIPReputation(ipAddress: string): boolean {
    // Placeholder for IP reputation check
    // In production, integrate with services like VirusTotal, AbuseIPDB, etc.
    const knownMaliciousIPs = ['127.0.0.1', '0.0.0.0']; // Example
    return knownMaliciousIPs.includes(ipAddress);
  }

  private async getUserTransactionPattern(userId: string): Promise<TransactionPattern> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: transactions, error } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('patient_id', userId)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo);

      if (error || !transactions?.length) {
        return {
          userId,
          averageAmount: 0,
          frequencyPattern: [],
          timePattern: new Array(24).fill(0),
          locationPattern: [],
          devicePattern: []
        };
      }

      const amounts = transactions.map(t => t.amount);
      const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Build time pattern (hourly frequency)
      const timePattern = new Array(24).fill(0);
      transactions.forEach(t => {
        const hour = new Date(t.created_at).getHours();
        timePattern[hour]++;
      });

      return {
        userId,
        averageAmount,
        frequencyPattern: [], // Could be implemented for daily/weekly patterns
        timePattern,
        locationPattern: [], // Would need location data
        devicePattern: [] // Would need device data
      };

    } catch (error) {
      logger.error('Error getting user transaction pattern', 'FRAUD_DETECTION', error);
      return {
        userId,
        averageAmount: 0,
        frequencyPattern: [],
        timePattern: new Array(24).fill(0),
        locationPattern: [],
        devicePattern: []
      };
    }
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private getRecommendations(level: string, factors: string[]): string[] {
    const recommendations: string[] = [];

    switch (level) {
      case 'critical':
        recommendations.push('Block transaction immediately');
        recommendations.push('Require manual verification');
        recommendations.push('Contact user via verified phone number');
        break;
      case 'high':
        recommendations.push('Require additional authentication');
        recommendations.push('Send security alert to user');
        recommendations.push('Monitor closely for 24 hours');
        break;
      case 'medium':
        recommendations.push('Send notification to user');
        recommendations.push('Log for review');
        break;
      case 'low':
        recommendations.push('Continue monitoring');
        break;
    }

    // Add specific recommendations based on factors
    if (factors.some(f => f.includes('velocity'))) {
      recommendations.push('Implement transaction cooldown period');
    }
    if (factors.some(f => f.includes('location'))) {
      recommendations.push('Verify location with user');
    }
    if (factors.some(f => f.includes('device'))) {
      recommendations.push('Send device verification email');
    }

    return recommendations;
  }

  private async createFraudAlert(
    userId: string,
    type: FraudAlert['type'],
    severity: FraudAlert['severity'],
    description: string,
    riskScore: number,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('fraud_alerts')
        .insert({
          user_id: userId,
          type,
          severity,
          description,
          risk_score: riskScore,
          metadata,
          created_at: new Date().toISOString(),
          resolved: false
        })
        .select()
        .single();

      if (error) throw error;

      // Send security notification
      await securityNotificationService.createSecurityNotification(
        userId,
        'suspicious_activity',
        'Fraud Alert',
        description,
        severity,
        true,
        '/security/alerts'
      );

      logger.info('Fraud alert created', 'FRAUD_DETECTION', { 
        alertId: data.id, 
        userId, 
        severity, 
        riskScore 
      });

    } catch (error) {
      errorHandler.handleError(error, 'createFraudAlert');
    }
  }

  async getFraudAlerts(userId: string, unresolved: boolean = false): Promise<FraudAlert[]> {
    try {
      let query = supabase
        .from('fraud_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unresolved) {
        query = query.eq('resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(alert => ({
        id: alert.id,
        userId: alert.user_id,
        type: alert.type,
        severity: alert.severity,
        description: alert.description,
        riskScore: alert.risk_score,
        metadata: alert.metadata,
        createdAt: new Date(alert.created_at),
        resolved: alert.resolved
      }));

    } catch (error) {
      errorHandler.handleError(error, 'getFraudAlerts');
      return [];
    }
  }

  async resolveFraudAlert(alertId: string, resolution: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fraud_alerts')
        .update({ 
          resolved: true, 
          resolution,
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      logger.info('Fraud alert resolved', 'FRAUD_DETECTION', { alertId, resolution });
      return true;

    } catch (error) {
      errorHandler.handleError(error, 'resolveFraudAlert');
      return false;
    }
  }
}

export const fraudDetectionEngine = new FraudDetectionEngine();
