
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Mic, MicOff, MonitorUp, BatteryCharging, Signal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  currentQuality?: "high" | "medium" | "low";
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onQualityChange?: (quality: "high" | "medium" | "low") => void;
}

export const VideoControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  currentQuality = "high",
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onQualityChange,
}: VideoControlsProps) => {
  return (
    <div className="flex justify-center gap-4 mb-4 flex-wrap">
      <Button
        variant={isMuted ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      
      <Button
        variant={isVideoOff ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleVideo}
        title={isVideoOff ? "Turn camera on" : "Turn camera off"}
      >
        {isVideoOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
      </Button>
      
      <Button
        variant={isScreenSharing ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        <MonitorUp className="h-4 w-4" />
      </Button>

      {onQualityChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              title="Video quality settings"
            >
              <Signal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onClick={() => onQualityChange("high")}
              className={currentQuality === "high" ? "bg-gray-100 dark:bg-gray-800" : ""}
            >
              High Quality (Best)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onQualityChange("medium")}
              className={currentQuality === "medium" ? "bg-gray-100 dark:bg-gray-800" : ""}
            >
              Medium Quality (Balanced)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onQualityChange("low")}
              className={currentQuality === "low" ? "bg-gray-100 dark:bg-gray-800" : ""}
            >
              Low Quality (Data Saver)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
