
export interface VideoRoomProps {
  roomUrl: string;
  roomId?: string;  // Added for compatibility
  userName: string;
  videoQuality?: 'low' | 'medium' | 'high';
  onLeave?: () => void;
}

export interface VideoConsultationDetails {
  id: string;
  title?: string;
  provider: {
    first_name: string;
    last_name: string;
    specialty: string;
  };
  patient_id: string;
  provider_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  meeting_url?: string;
  notes?: string;
  created_at: string;
  duration?: number;
}

export interface ConsultationListProps {
  consultations?: VideoConsultationDetails[];
  loading?: boolean;
  onSelectConsultation?: (consultation: VideoConsultationDetails) => void;
  onJoinMeeting?: (consultation: VideoConsultationDetails) => void;
}
