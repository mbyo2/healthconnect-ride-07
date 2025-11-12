import { supabase } from '@/integrations/supabase/client';
import { errorHandler } from './error-handler';
import { logger } from './logger';
import { sessionManager } from './session-manager';

export interface SecurityNotification {
  id: string;
  userId: string;
  type: 'login_alert' | 'password_change' | 'biometric_setup' | '2fa_enabled' | 'suspicious_activity' | 'device_added';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: Date;
  actionRequired?: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  securityAlerts: boolean;
  loginAlerts: boolean;
  deviceAlerts: boolean;
}

class SecurityNotificationService {
  private notificationQueue: SecurityNotification[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startNotificationProcessor();
  }

  async createSecurityNotification(
    userId: string,
    type: SecurityNotification['type'],
    title: string,
    message: string,
    severity: SecurityNotification['severity'] = 'medium',
    actionRequired: boolean = false,
    actionUrl?: string
  ): Promise<void> {
    try {
      const notification: Omit<SecurityNotification, 'id' | 'createdAt'> = {
        userId,
        type,
        title,
        message,
        severity,
        isRead: false,
        actionRequired,
        actionUrl
      };

      const { data, error } = await supabase
        .from('security_notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          is_read: false,
          action_required: notification.actionRequired,
          action_url: notification.actionUrl,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Add to processing queue for immediate delivery
      this.notificationQueue.push({
        ...notification,
        id: data.id,
        createdAt: new Date(data.created_at)
      });

      logger.info('Security notification created', 'SECURITY_NOTIFICATION', {
        userId,
        type,
        severity
      });

    } catch (error) {
      errorHandler.handleError(error, 'createSecurityNotification');
      throw error;
    }
  }

  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<SecurityNotification[]> {
    try {
      let query = supabase
        .from('security_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        isRead: notification.is_read,
        createdAt: new Date(notification.created_at),
        actionRequired: notification.action_required,
        actionUrl: notification.action_url
      }));

    } catch (error) {
      errorHandler.handleError(error, 'getNotifications');
      return [];
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      logger.info('Notification marked as read', 'SECURITY_NOTIFICATION', { notificationId });

    } catch (error) {
      errorHandler.handleError(error, 'markAsRead');
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      logger.info('All notifications marked as read', 'SECURITY_NOTIFICATION', { userId });

    } catch (error) {
      errorHandler.handleError(error, 'markAllAsRead');
      throw error;
    }
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Return default preferences if none exist
      if (!data) {
        return {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          securityAlerts: true,
          loginAlerts: true,
          deviceAlerts: true
        };
      }

      return {
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        smsNotifications: data.sms_notifications,
        securityAlerts: data.security_alerts,
        loginAlerts: data.login_alerts,
        deviceAlerts: data.device_alerts
      };

    } catch (error) {
      errorHandler.handleError(error, 'getNotificationPreferences');
      // Return safe defaults on error
      return {
        emailNotifications: true,
        pushNotifications: false,
        smsNotifications: false,
        securityAlerts: true,
        loginAlerts: true,
        deviceAlerts: true
      };
    }
  }

  async updateNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          email_notifications: preferences.emailNotifications,
          push_notifications: preferences.pushNotifications,
          sms_notifications: preferences.smsNotifications,
          security_alerts: preferences.securityAlerts,
          login_alerts: preferences.loginAlerts,
          device_alerts: preferences.deviceAlerts,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      logger.info('Notification preferences updated', 'SECURITY_NOTIFICATION', { userId });

    } catch (error) {
      errorHandler.handleError(error, 'updateNotificationPreferences');
      throw error;
    }
  }

  // Predefined notification templates
  async notifyLogin(userId: string, deviceInfo: string, location: string, ipAddress: string): Promise<void> {
    const preferences = await this.getNotificationPreferences(userId);
    if (!preferences.loginAlerts) return;

    await this.createSecurityNotification(
      userId,
      'login_alert',
      'New Login Detected',
      `A new login was detected on your account from ${deviceInfo} in ${location} (IP: ${ipAddress}). If this wasn't you, please secure your account immediately.`,
      'medium',
      true,
      '/security/sessions'
    );
  }

  async notifyPasswordChange(userId: string): Promise<void> {
    await this.createSecurityNotification(
      userId,
      'password_change',
      'Password Changed',
      'Your account password has been successfully changed. If you did not make this change, please contact support immediately.',
      'high',
      true,
      '/security/account'
    );
  }

  async notifyBiometricSetup(userId: string): Promise<void> {
    await this.createSecurityNotification(
      userId,
      'biometric_setup',
      'Biometric Authentication Enabled',
      'Biometric authentication has been successfully set up for your account. You can now use fingerprint or face recognition to sign in.',
      'low'
    );
  }

  async notify2FAEnabled(userId: string): Promise<void> {
    await this.createSecurityNotification(
      userId,
      '2fa_enabled',
      'Two-Factor Authentication Enabled',
      'Two-factor authentication has been successfully enabled for your account. Your account is now more secure.',
      'low'
    );
  }

  async notifySuspiciousActivity(userId: string, details: string): Promise<void> {
    await this.createSecurityNotification(
      userId,
      'suspicious_activity',
      'Suspicious Activity Detected',
      `Suspicious activity has been detected on your account: ${details}. Please review your recent activity and secure your account if necessary.`,
      'critical',
      true,
      '/security/activity'
    );
  }

  async notifyNewDevice(userId: string, deviceInfo: string): Promise<void> {
    const preferences = await this.getNotificationPreferences(userId);
    if (!preferences.deviceAlerts) return;

    await this.createSecurityNotification(
      userId,
      'device_added',
      'New Device Access',
      `A new device (${deviceInfo}) has accessed your account. If this wasn't you, please review your active sessions.`,
      'medium',
      false,
      '/security/sessions'
    );
  }

  private startNotificationProcessor(): void {
    this.processingInterval = setInterval(async () => {
      if (this.notificationQueue.length === 0) return;

      const notifications = [...this.notificationQueue];
      this.notificationQueue = [];

      for (const notification of notifications) {
        try {
          await this.processNotification(notification);
        } catch (error) {
          errorHandler.handleError(error, 'processNotification');
          // Re-queue failed notifications
          this.notificationQueue.push(notification);
        }
      }
    }, 5000); // Process every 5 seconds
  }

  private async processNotification(notification: SecurityNotification): Promise<void> {
    const preferences = await this.getNotificationPreferences(notification.userId);

    // Send email notification if enabled
    if (preferences.emailNotifications && preferences.securityAlerts) {
      await this.sendEmailNotification(notification);
    }

    // Send push notification if enabled
    if (preferences.pushNotifications && preferences.securityAlerts) {
      await this.sendPushNotification(notification);
    }

    // Send SMS for critical notifications if enabled
    if (preferences.smsNotifications && notification.severity === 'critical') {
      await this.sendSMSNotification(notification);
    }

    // Trigger real-time updates
    await this.broadcastNotification(notification);
  }

  private async sendEmailNotification(notification: SecurityNotification): Promise<void> {
    try {
      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      logger.info('Email notification sent', 'EMAIL_NOTIFICATION', {
        userId: notification.userId,
        type: notification.type
      });
    } catch (error) {
      errorHandler.handleError(error, 'sendEmailNotification');
    }
  }

  private async sendPushNotification(notification: SecurityNotification): Promise<void> {
    try {
      // In production, integrate with push notification service (FCM, APNs, etc.)
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        // Implementation would go here
      }
      
      logger.info('Push notification sent', 'PUSH_NOTIFICATION', {
        userId: notification.userId,
        type: notification.type
      });
    } catch (error) {
      errorHandler.handleError(error, 'sendPushNotification');
    }
  }

  private async sendSMSNotification(notification: SecurityNotification): Promise<void> {
    try {
      // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
      logger.info('SMS notification sent', 'SMS_NOTIFICATION', {
        userId: notification.userId,
        type: notification.type
      });
    } catch (error) {
      errorHandler.handleError(error, 'sendSMSNotification');
    }
  }

  private async broadcastNotification(notification: SecurityNotification): Promise<void> {
    try {
      // Use Supabase real-time to broadcast to connected clients
      await supabase.channel('security-notifications')
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: notification
        });

      logger.info('Real-time notification broadcasted', 'REALTIME_NOTIFICATION', {
        userId: notification.userId,
        type: notification.type
      });
    } catch (error) {
      errorHandler.handleError(error, 'broadcastNotification');
    }
  }

  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const securityNotificationService = new SecurityNotificationService();
