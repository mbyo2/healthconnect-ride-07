
export type AdminLevel = "admin" | "superadmin";

export type StatusType = "pending" | "approved" | "rejected" | "completed" | "scheduled" | "canceled";

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  appointment_reminders: boolean;
  application_updates: boolean;
  marketing_emails: boolean;
  system_updates: boolean;
  payment_notifications: boolean;
  chat_notifications: boolean;
  push_notifications: boolean;
  message_alerts: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface UserSettings {
  id: string;
  user_id: string;
  language: string;
  timezone: string;
  date_format: string;
  notifications_enabled: boolean;
  accessibility_mode: boolean;
  created_at?: string;
  updated_at?: string;
}
