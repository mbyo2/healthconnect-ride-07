import { createClient } from '@supabase/supabase-js';
import { errorHandler } from './error-handler';
import { logger } from './logger';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  location?: string;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'suspicious_activity' | 'password_change' | 'biometric_setup' | '2fa_enabled';
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  timestamp: Date;
  details?: Record<string, any>;
}

class SessionManager {
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startSessionMonitoring();
    this.setupActivityTracking();
  }

  async createSession(userId: string): Promise<string> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const sessionId = this.generateSessionId();
      
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          device_info: deviceInfo.device,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true,
          location: deviceInfo.location
        });

      if (error) throw error;

      // Log security event
      await this.logSecurityEvent({
        type: 'login',
        userId,
        deviceInfo: deviceInfo.device,
        ipAddress: await this.getClientIP(),
        timestamp: new Date(),
      });

      logger.info('Session created successfully', 'SESSION', { userId, sessionId });
      return sessionId;

    } catch (error) {
      errorHandler.handleError(error, 'createSession');
      throw error;
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        return false;
      }

      // Check if session has expired
      const lastActivity = new Date(session.last_activity);
      const now = new Date();
      const timeDiff = now.getTime() - lastActivity.getTime();

      if (timeDiff > this.SESSION_TIMEOUT) {
        await this.invalidateSession(sessionId);
        return false;
      }

      // Update last activity
      await this.updateSessionActivity(sessionId);
      return true;

    } catch (error) {
      errorHandler.handleError(error, 'validateSession');
      return false;
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      logger.info('Session invalidated', 'SESSION', { sessionId });

    } catch (error) {
      errorHandler.handleError(error, 'invalidateSession');
      throw error;
    }
  }

  async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    try {
      let query = supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (exceptSessionId) {
        query = query.neq('id', exceptSessionId);
      }

      const { error } = await query;
      if (error) throw error;

      logger.info('All user sessions invalidated', 'SESSION', { userId, exceptSessionId });

    } catch (error) {
      errorHandler.handleError(error, 'invalidateAllUserSessions');
      throw error;
    }
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      return sessions.map(session => ({
        id: session.id,
        userId: session.user_id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        createdAt: new Date(session.created_at),
        lastActivity: new Date(session.last_activity),
        isActive: session.is_active,
        location: session.location
      }));

    } catch (error) {
      errorHandler.handleError(error, 'getUserSessions');
      return [];
    }
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          type: event.type,
          user_id: event.userId,
          device_info: event.deviceInfo,
          ip_address: event.ipAddress,
          timestamp: event.timestamp.toISOString(),
          details: event.details || {}
        });

      if (error) throw error;

      logger.info('Security event logged', 'SECURITY', { 
        type: event.type, 
        userId: event.userId 
      });

    } catch (error) {
      errorHandler.handleError(error, 'logSecurityEvent');
    }
  }

  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Check for multiple failed login attempts
      const { data: failedLogins, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'login')
        .gte('timestamp', oneHourAgo.toISOString());

      if (error) throw error;

      // Check for unusual IP addresses or locations
      const { data: recentSessions } = await supabase
        .from('user_sessions')
        .select('ip_address, location')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString());

      const uniqueIPs = new Set(recentSessions?.map(s => s.ip_address) || []);
      const uniqueLocations = new Set(recentSessions?.map(s => s.location) || []);

      // Flag as suspicious if more than 5 failed logins or multiple IPs/locations
      const isSuspicious = (failedLogins?.length || 0) > 5 || 
                          uniqueIPs.size > 3 || 
                          uniqueLocations.size > 2;

      if (isSuspicious) {
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          userId,
          deviceInfo: this.getDeviceInfo().device,
          ipAddress: await this.getClientIP(),
          timestamp: new Date(),
          details: {
            failedLogins: failedLogins?.length || 0,
            uniqueIPs: uniqueIPs.size,
            uniqueLocations: uniqueLocations.size
          }
        });
      }

      return isSuspicious;

    } catch (error) {
      errorHandler.handleError(error, 'detectSuspiciousActivity');
      return false;
    }
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

    } catch (error) {
      errorHandler.handleError(error, 'updateSessionActivity');
    }
  }

  private startSessionMonitoring(): void {
    this.sessionCheckInterval = setInterval(async () => {
      try {
        // Clean up expired sessions
        const expiredTime = new Date(Date.now() - this.SESSION_TIMEOUT);
        
        await supabase
          .from('user_sessions')
          .update({ 
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('is_active', true)
          .lt('last_activity', expiredTime.toISOString());

      } catch (error) {
        errorHandler.handleError(error, 'sessionMonitoring');
      }
    }, this.ACTIVITY_UPDATE_INTERVAL);
  }

  private setupActivityTracking(): void {
    // Track user activity for session management
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, this.throttle(() => {
        const sessionId = localStorage.getItem('current-session-id');
        if (sessionId) {
          this.updateSessionActivity(sessionId);
        }
      }, this.ACTIVITY_UPDATE_INTERVAL), true);
    });
  }

  private throttle(func: Function, limit: number): () => void {
    let inThrottle: boolean;
    return function(this: any) {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private getDeviceInfo(): { device: string; location: string } {
    const userAgent = navigator.userAgent;
    let device = 'Unknown Device';
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device = 'Mobile Device';
    } else if (/Tablet/.test(userAgent)) {
      device = 'Tablet';
    } else {
      device = 'Desktop';
    }

    // Add browser info
    if (userAgent.includes('Chrome')) device += ' (Chrome)';
    else if (userAgent.includes('Firefox')) device += ' (Firefox)';
    else if (userAgent.includes('Safari')) device += ' (Safari)';
    else if (userAgent.includes('Edge')) device += ' (Edge)';

    return {
      device,
      location: 'Unknown' // In production, use geolocation API
    };
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, this should be handled by the backend
      return 'Unknown IP';
    } catch {
      return 'Unknown IP';
    }
  }

  destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
  }
}

export const sessionManager = new SessionManager();
