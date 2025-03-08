
export type AdminLevel = "admin" | "superadmin";

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
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}
