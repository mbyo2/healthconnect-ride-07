
export interface VideoRoomProps {
  roomUrl: string;
  roomId?: string;  // Added for compatibility
  userName: string;
  videoQuality?: 'low' | 'medium' | 'high';
  onLeave?: () => void;
}
