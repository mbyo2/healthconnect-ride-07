
export interface VideoRoomProps {
  roomUrl: string;
  roomId?: string;  // Added for compatibility
  userName: string;
  videoQuality?: 'low' | 'medium' | 'high';
  onLeave?: () => void;
}

export interface VideoConsultationDetails {
  id: string;
  title: string;
  provider: string;
  date: string;
  time: string;
  status: string;
  roomUrl?: string;
  duration?: number;
}

export interface ConsultationListProps {
  consultations: VideoConsultationDetails[];
  loading?: boolean;
  onSelectConsultation?: (consultation: VideoConsultationDetails) => void;
}
