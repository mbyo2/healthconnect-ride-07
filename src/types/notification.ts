
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'appointment' | 'message' | 'system';
  read: boolean;
  created_at: string;
  /** Appointment this reminder is about (null for legacy/general rows). */
  appointment_id?: string | null;
  /** 'confirmation' (visible at booking) or 'reminder' (visible at due time). */
  kind?: 'confirmation' | 'reminder';
  /** Earliest time this row may surface. Rows with a future visible_at are hidden. */
  visible_at?: string;
}
