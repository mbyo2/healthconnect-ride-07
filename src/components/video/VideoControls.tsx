
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Mic, MicOff, MonitorUp, BatteryCharging, Signal, Tv, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useIsTVDevice } from "@/hooks/use-tv-detection";

interface VideoControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isRecording?: boolean;
  currentQuality?: "high" | "medium" | "low";
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording?: () => void;
  onQualityChange?: (quality: "high" | "medium" | "low") => void;
}

export const VideoControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isRecording = false,
  currentQuality = "high",
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onQualityChange,
}: VideoControlsProps) => {
  const isTV = useIsTVDevice();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div className={`flex justify-center gap-4 mb-4 flex-wrap ${isTV ? 'tv-controls p-4' : ''} ${isMobile ? 'fixed bottom-16 left-0 right-0 bg-background/90 backdrop-blur-sm p-3 z-50 rounded-t-lg shadow-lg' : ''}`}>
      <Button
        variant={isMuted ? "destructive" : "secondary"}
        size={isTV ? "lg" : isMobile ? "default" : "icon"}
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
        className={`${isTV ? "px-6 py-4 text-lg" : ""} ${isMobile ? "h-14 min-w-14" : ""}`}
        data-dpad-focusable={isTV ? "true" : undefined}
      >
        {isMuted ? (
          <>
            <MicOff className={isTV ? "h-6 w-6 mr-2" : "h-5 w-5"} />
            {(isTV || isMobile) && "Unmute"}
          </>
        ) : (
          <>
            <Mic className={isTV ? "h-6 w-6 mr-2" : "h-5 w-5"} />
            {(isTV || isMobile) && "Mute"}
          </>
        )}
      </Button>
      
      <Button
        variant={isVideoOff ? "destructive" : "secondary"}
        size={isTV ? "lg" : isMobile ? "default" : "icon"}
        onClick={onToggleVideo}
        title={isVideoOff ? "Turn camera on" : "Turn camera off"}
        className={`${isTV ? "px-6 py-4 text-lg" : ""} ${isMobile ? "h-14 min-w-14" : ""}`}
        data-dpad-focusable={isTV ? "true" : undefined}
      >
        {isVideoOff ? (
          <>
            <CameraOff className={isTV ? "h-6 w-6 mr-2" : "h-5 w-5"} />
            {(isTV || isMobile) && "Camera On"}
          </>
        ) : (
          <>
            <Camera className={isTV ? "h-6 w-6 mr-2" : "h-5 w-5"} />
            {(isTV || isMobile) && "Camera Off"}
          </>
        )}
      </Button>
      
      <Button
        variant={isScreenSharing ? "destructive" : "secondary"}
        size={isTV ? "lg" : isMobile ? "default" : "icon"}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
        className={`${isTV ? "px-6 py-4 text-lg" : ""} ${isMobile ? "h-14 min-w-14" : ""}`}
        data-dpad-focusable={isTV ? "true" : undefined}
      >
        <MonitorUp className={isTV ? "h-6 w-6 mr-2" : "h-5 w-5"} />
        {(isTV || isMobile) && (isScreenSharing ? "Stop Share" : "Share")}
      </Button>

      {onToggleRecording && (
        <Button
          variant={isRecording ? "destructive" : "secondary"}
          size={isTV ? "lg" : isMobile ? "default" : "icon"}
          onClick={onToggleRecording}
          title={isRecording ? "Stop recording" : "Record meeting"}
          className={`${isTV ? "px-6 py-4 text-lg" : ""} ${isMobile ? "h-14 min-w-14" : ""}`}
          data-dpad-focusable={isTV ? "true" : undefined}
        >
          <Video className={`${isRecording ? "animate-pulse" : ""} ${isTV ? "h-6 w-6 mr-2" : "h-5 w-5"}`} />
          {(isTV || isMobile) && (isRecording ? "Stop Rec" : "Record")}
        </Button>
      )}

      {onQualityChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size={isTV ? "lg" : isMobile ? "default" : "icon"}
              title="Video quality settings"
              className={`${isTV ? "px-6 py-4 text-lg" : ""} ${isMobile ? "h-14 min-w-14" : ""}`}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              <Signal className={isTV ? "h-6 w-6 mr-2" : "h-5 w-5"} />
              {(isTV || isMobile) && "Quality"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={`${isTV ? "p-2 min-w-52 text-lg" : ""} ${isMobile ? "min-w-48" : ""} z-50 bg-popover border shadow-md`}>
            <DropdownMenuItem 
              onClick={() => onQualityChange("high")}
              className={`${currentQuality === "high" ? "bg-accent" : ""} ${isTV ? "p-4 text-lg" : ""} ${isMobile ? "p-3 text-base" : ""}`}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              High Quality (Best)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onQualityChange("medium")}
              className={`${currentQuality === "medium" ? "bg-accent" : ""} ${isTV ? "p-4 text-lg" : ""} ${isMobile ? "p-3 text-base" : ""}`}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              Medium Quality (Balanced)
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onQualityChange("low")}
              className={`${currentQuality === "low" ? "bg-accent" : ""} ${isTV ? "p-4 text-lg" : ""} ${isMobile ? "p-3 text-base" : ""}`}
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
