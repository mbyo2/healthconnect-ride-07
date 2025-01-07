export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy: 'private' | 'public';
  created_at: string;
  config?: {
    start_audio_off?: boolean;
    start_video_off?: boolean;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
  };
}

export interface VideoConsultationDetails extends DailyRoom {
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}