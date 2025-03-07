
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Mic, MicOff, MonitorUp, BatteryCharging, Signal, Tv } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  const isTV = useMediaQuery('(min-width: 1920px) and (hover: none)');
  
  return (
    <div className={`flex justify-center gap-4 mb-4 flex-wrap ${isTV ? 'tv-controls p-4' : ''}`}>
      <Button
        variant={isMuted ? "destructive" : "secondary"}
        size={isTV ? "lg" : "icon"}
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
        className={isTV ? "px-6 py-4 text-lg" : ""}
        data-dpad-focusable={isTV ? "true" : undefined}
      >
        {isMuted ? (
          <>
            <MicOff className={isTV ? "h-6 w-6 mr-2" : "h-4 w-4"} />
            {isTV && "Unmute"}
          </>
        ) : (
          <>
            <Mic className={isTV ? "h-6 w-6 mr-2" : "h-4 w-4"} />
            {isTV && "Mute"}
          </>
        )}
      </Button>
      
      <Button
        variant={isVideoOff ? "destructive" : "secondary"}
        size={isTV ? "lg" : "icon"}
        onClick={onToggleVideo}
        title={isVideoOff ? "Turn camera on" : "Turn camera off"}
        className={isTV ? "px-6 py-4 text-lg" : ""}
        data-dpad-focusable={isTV ? "true" : undefined}
      >
        {isVideoOff ? (
          <>
            <CameraOff className={isTV ? "h-6 w-6 mr-2" : "h-4 w-4"} />
            {isTV && "Camera On"}
          </>
        ) : (
          <>
            <Camera className={isTV ? "h-6 w-6 mr-2" : "h-4 w-4"} />
            {isTV && "Camera Off"}
          </>
        )}
      </Button>
      
      <Button
        variant={isScreenSharing ? "destructive" : "secondary"}
        size={isTV ? "lg" : "icon"}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
        className={isTV ? "px-6 py-4 text-lg" : ""}
        data-dpad-focusable={isTV ? "true" : undefined}
      >
        <MonitorUp className={isTV ? "h-6 w-6 mr-2" : "h-4 w-4"} />
        {isTV && (isScreenSharing ? "Stop Sharing" : "Share Screen")}
      </Button>

      {onQualityChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size={isTV ? "lg" : "icon"}
              title="Video quality settings"
              className={isTV ? "px-6 py-4 text-lg" : ""}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              <Signal className={isTV ? "h-6 w-6 mr-2" : "h-4 w-4"} />
              {isTV && "Quality"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={isTV ? "p-2 min-w-52 text-lg" : ""}>
            <DropdownMenuItem 
              onClick={() => onQualityChange("high")}
              className={`${currentQuality === "high" ? "bg-gray-100 dark:bg-gray-800" : ""} ${isTV ? "p-4 text-lg" : ""}`}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              High Quality (Best)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onQualityChange("medium")}
              className={`${currentQuality === "medium" ? "bg-gray-100 dark:bg-gray-800" : ""} ${isTV ? "p-4 text-lg" : ""}`}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              Medium Quality (Balanced)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onQualityChange("low")}
              className={`${currentQuality === "medium" ? "bg-gray-100 dark:bg-gray-800" : ""} ${isTV ? "p-4 text-lg" : ""}`}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              Low Quality (Data Saver)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {isTV && (
        <Button
          variant="outline"
          size="lg"
          className="px-6 py-4 text-lg ml-auto bg-blue-100 dark:bg-blue-900"
          data-dpad-focusable="true"
        >
          <Tv className="h-6 w-6 mr-2" />
          TV Mode
        </Button>
      )}
    </div>
  );
};
