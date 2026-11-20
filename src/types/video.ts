
export interface VideoRoomProps {
  roomUrl: string;
  roomId?: string;  // Added for compatibility
  userName: string;
  videoQuality?: 'low' | 'medium' | 'high';
  meetingToken?: string;  // Daily.co meeting token for private rooms
  onLeave?: () => void;
  /** Consultation this room belongs to — enables the join-link copy. */
  consultationId?: string;
  /** True when the local user is the consultation's provider (host). */
  isProvider?: boolean;
  /** Display name of the other participant — used by the waiting
   *  state ("Waiting for … to start the visit") and the info panel. */
  peerName?: string;
  /** Provider-only: end the meeting for everyone (server-side). */
  onEndMeeting?: () => Promise<void> | void;
  /** Fired when the meeting was ended by the other side (realtime). */
  meetingEnded?: boolean;
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
  ended_at?: string | null;
  ended_by?: string | null;
}

export interface ConsultationListProps {
  consultations?: VideoConsultationDetails[];
  loading?: boolean;
  onSelectConsultation?: (consultation: VideoConsultationDetails) => void;
  onJoinMeeting?: (consultation: VideoConsultationDetails) => void;
  /** Warm up the Daily room + token ahead of the click (join latency):
   *  fired for consultations inside their window and on Join intent. */
  onPrefetch?: (consultation: VideoConsultationDetails) => void;
}
