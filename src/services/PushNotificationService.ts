import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export class PushNotificationService {
  /**
   * Subscribe user to push notifications
   */
  static async subscribe(subscription: PushSubscription): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: subscription as any,
        });

      if (error) throw error;
      
      logger.info('Push notification subscription successful', 'PUSH_NOTIFICATIONS');
      return true;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications', 'PUSH_NOTIFICATIONS', error);
      return false;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  static async unsubscribe(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      logger.info('Push notification unsubscription successful', 'PUSH_NOTIFICATIONS');
      return true;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications', 'PUSH_NOTIFICATIONS', error);
      return false;
    }
  }

  /**
   * Check if user has push notifications enabled
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send notification to a specific user (via edge function)
   */
  static async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'send_to_user',
          userId,
          payload,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to send push notification', 'PUSH_NOTIFICATIONS', error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'send_to_users',
          userIds,
          payload,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to send push notifications', 'PUSH_NOTIFICATIONS', error);
      return false;
    }
  }

  /**
   * Send notification to all users with a specific role
   */
  static async sendToRole(role: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'send_to_role',
          role,
          payload,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to send push notifications to role', 'PUSH_NOTIFICATIONS', error);
      return false;
    }
  }
}

/**
 * Helper to register service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    logger.warn('Service workers not supported', 'PUSH_NOTIFICATIONS');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    logger.info('Service worker registered', 'PUSH_NOTIFICATIONS');
    return registration;
  } catch (error) {
    logger.error('Failed to register service worker', 'PUSH_NOTIFICATIONS', error);
    return null;
  }
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    logger.warn('Notifications not supported', 'PUSH_NOTIFICATIONS');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  logger.info(`Notification permission: ${permission}`, 'PUSH_NOTIFICATIONS');
  return permission;
}
