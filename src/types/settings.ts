
// Type definitions for settings-related tables in Supabase

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  appointment_reminders: boolean; 
  message_alerts: boolean;
  system_updates: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  subscription: any; // Using 'any' for the subscription object as it's a JSONB in Supabase
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  language: string;
  timezone: string;
  date_format: string;
  notifications_enabled: boolean;
  accessibility_mode: boolean;
  created_at: string;
  updated_at: string;
}

// Update UserRole and AdminLevel definitions
export type UserRole = 'admin' | 'health_personnel' | 'patient';
export type AdminLevel = 'admin' | 'superadmin';

// Add PushSubscriptionJSON interface to fix TypeScript errors with the Web Push API
export interface PushSubscriptionJSON {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh: string;
    auth: string;
  };
}
