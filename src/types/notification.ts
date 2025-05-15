
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'appointment' | 'message' | 'system';
  read: boolean;
  created_at: string;
}
