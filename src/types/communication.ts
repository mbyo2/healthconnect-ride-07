export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read: boolean;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  message_id: string;
  uploaded_at: string;
}

export interface VideoCall {
  id: string;
  provider_id: string;
  patient_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  meeting_url?: string;
  provider: {
    first_name: string | null;
    last_name: string | null;
  };
}