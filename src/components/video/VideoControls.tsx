import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Mic, MicOff, MonitorUp } from "lucide-react";

interface VideoControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

export const VideoControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
}: VideoControlsProps) => {
  return (
    <div className="flex justify-center gap-4 mb-4">
      <Button
        variant={isMuted ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleMute}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button
        variant={isVideoOff ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleVideo}
      >
        {isVideoOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
      </Button>
      <Button
        variant={isScreenSharing ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleScreenShare}
      >
        <MonitorUp className="h-4 w-4" />
      </Button>
    </div>
  );
};