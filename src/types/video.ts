
export interface VideoConsultationDetails {
  id: string;
  patient_id: string;
  provider_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  meeting_url?: string;
  notes?: string;
  provider?: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
}

export interface VideoRoomProps {
  roomUrl: string;
  userName: string;
  videoQuality?: 'low' | 'medium' | 'high';
  onLeave?: () => void;
}

export interface ConsultationListProps {
  onJoinMeeting: (consultation: VideoConsultationDetails) => void;
}
