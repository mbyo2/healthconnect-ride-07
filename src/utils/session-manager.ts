import { supabase } from '@/integrations/supabase/client';
import { errorHandler } from './error-handler';
import { logger } from './logger';

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

// TEMPORARILY DISABLED - Session management requires database migration
// This class will be re-enabled after proper database setup
class SessionManager {
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startSessionMonitoring();
    this.setupActivityTracking();
  }

  async createSession(userId: string): Promise<string> {
    // TEMPORARILY DISABLED - Returns mock session ID
    logger.info('Session creation temporarily disabled', 'SESSION', { userId });
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (err) {
      // Fall back to a safe string
    }

    return `${Date.now()}-${Math.random()}`;
  }

  async validateSession(sessionId: string): Promise<boolean> {
    // TEMPORARILY DISABLED - Always returns true
    return true;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    // TEMPORARILY DISABLED
    logger.info('Session invalidation temporarily disabled', 'SESSION', { sessionId });
  }

  async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    // TEMPORARILY DISABLED
    logger.info('Session invalidation temporarily disabled', 'SESSION', { userId, exceptSessionId });
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    // TEMPORARILY DISABLED - Returns empty array
    return [];
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // TEMPORARILY DISABLED - Logs to console only
    logger.info('Security event', 'SECURITY', { 
      type: event.type, 
      userId: event.userId 
    });
  }

  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    // TEMPORARILY DISABLED - Always returns false
    return false;
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    // TEMPORARILY DISABLED
  }

  private startSessionMonitoring(): void {
    // TEMPORARILY DISABLED
  }

  private setupActivityTracking(): void {
    // Track user activity for session management
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, this.throttle(() => {
        try {
          const sessionId = typeof localStorage !== 'undefined' ? localStorage.getItem('current-session-id') : null;
          if (sessionId) {
            this.updateSessionActivity(sessionId);
          }
        } catch (err) {
          // localStorage may be blocked (e.g., private browsing) — ignore
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
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (err) {
      // ignore and fallback
    }

    return `${Date.now()}-${Math.random()}`;
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
