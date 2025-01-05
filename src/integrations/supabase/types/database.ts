export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          provider_id: string;
          date: string;
          time: string;
          status: 'scheduled' | 'cancelled' | 'completed';
          type: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          provider_id: string;
          date: string;
          time: string;
          status?: 'scheduled' | 'cancelled' | 'completed';
          type: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          provider_id?: string;
          date?: string;
          time?: string;
          status?: 'scheduled' | 'cancelled' | 'completed';
          type?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_attachments: {
        Row: {
          id: string;
          message_id: string;
          file_name: string;
          file_type?: string;
          file_size?: number;
          file_url: string;
          uploaded_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
          read: boolean;
        };
      };
      video_consultations: {
        Row: {
          id: string;
          patient_id: string;
          provider_id: string;
          scheduled_start: string;
          scheduled_end: string;
          meeting_url?: string;
          status: 'scheduled' | 'active' | 'completed' | 'cancelled';
          notes?: string;
          created_at?: string;
        };
      };
    };
  };
}