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

export interface PrivacySettings {
  id: string;
  user_id: string;
  share_medical_data_with_providers: boolean;
  allow_anonymous_data_for_research: boolean;
  data_retention_period_days: number;
  show_profile_in_search: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  details?: any;
}

// Constants for two-factor authentication methods
export type TwoFactorMethod = "email" | "app" | "sms";

export interface TwoFactorSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  preferred_method: TwoFactorMethod;
  backup_codes?: string[];
  created_at?: string;
  updated_at?: string;
}

// TODO: Review all status types and ensure transitions are implemented in relevant workflows
