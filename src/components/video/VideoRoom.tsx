
// We need to fix the experimentalChromeVideoMuteLightOff error in VideoRoom.tsx
// Since we don't have access to the original file, I'll need to re-implement it based on types

import { useState, useEffect, useCallback } from "react";
import DailyIframe from '@daily-co/daily-js';
import { VideoControls } from "./VideoControls";
import { VideoRoomProps } from "@/types/video";
import { useDeviceCapabilities } from "@/hooks/use-device-capabilities";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useIsTVDevice } from "@/hooks/use-tv-detection";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function VideoRoom({ roomUrl, userName, videoQuality = "high", onLeave }: VideoRoomProps) {
  const [callFrame, setCallFrame] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  
  const capabilities = useDeviceCapabilities();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTV = useIsTVDevice();
  
  const handleJoinedMeeting = useCallback(() => {
    setHasJoined(true);
    toast.success("You've joined the meeting");
  }, []);
  
  const handleError = useCallback((e: any) => {
    console.error("Daily.co error:", e);
    setError(`Error: ${e.errorMsg || "Unknown error"}`);
    toast.error(`Video call error: ${e.errorMsg || "Unknown error"}`);
  }, []);
  
  const handleParticipantsChange = useCallback((e: any) => {
    setParticipants(Object.values(e.participants));
  }, []);
  
  const handleNetworkQualityChange = useCallback((e: any) => {
    if (e.threshold === "low") {
      toast.warning("Poor network quality. Video quality reduced.", { id: "network-quality" });
    }
  }, []);
  
  const handleNetworkConnection = useCallback((e: any) => {
    if (e.type === "disconnected") {
      setReconnecting(true);
      toast.error("Connection lost. Attempting to reconnect...", { id: "reconnect-toast" });
    } else if (e.type === "connected" && reconnecting) {
      setReconnecting(false);
      toast.success("Reconnected successfully!", { id: "reconnect-toast" });
    }
  }, [reconnecting]);

  useEffect(() => {
    // Adapt quality based on device type and capabilities
    let roomQuality = videoQuality;
    if (isTV) {
      roomQuality = "high"; // TVs typically have good bandwidth and large screens
    } else if (capabilities.network.connectionQuality === "poor") {
      roomQuality = "low";
    } else if (isMobile && !navigator.onLine) {
      roomQuality = "low";
    }

    const videoConfig = {
      low: { height: { max: 360 }, frameRate: { max: 15 } },
      medium: { height: { max: 720 }, frameRate: { max: 24 } },
      high: { height: { max: 1080 }, frameRate: { max: 30 } }
    };
    
    // Create Daily callFrame
    if (!callFrame && roomUrl) {
      const options = {
        url: roomUrl,
        userName: userName,
        showLeaveButton: true,
        showFullscreenButton: true,
        showUserNameLabel: true,
        iframeStyle: {
          position: 'fixed',
          top: isMobile ? '60px' : '0',
          left: '0',
          width: '100%',
          height: isMobile ? 'calc(100% - 140px)' : '100%',
          border: 'none',
          zIndex: 20
        },
        dailyConfig: {
          // Fix experimental properties warning
          experimentalChromeVideoMute: isTV,
          camSimulcastEncodings: videoConfig[roomQuality],
          micQuality: roomQuality === "low" ? "speech-quality" : "speech-plus-quality"
        }
      };
      
      try {
        const daily = DailyIframe.createFrame(
          document.getElementById("video-container") || undefined,
          options
        );
        
        daily.on("joined-meeting", handleJoinedMeeting);
        daily.on("error", handleError);
        daily.on("participant-joined", handleParticipantsChange);
        daily.on("participant-left", handleParticipantsChange);
        daily.on("network-quality-change", handleNetworkQualityChange);
        daily.on("network-connection", handleNetworkConnection);
        
        daily.on("recording-started", () => {
          setIsRecording(true);
          toast.info("Recording started");
        });
        
        daily.on("recording-stopped", () => {
          setIsRecording(false);
          toast.info("Recording stopped");
        });

        setCallFrame(daily);
        daily.join();
      } catch (err) {
        console.error("Error creating Daily.co frame:", err);
        setError("Failed to create video call. Please try again.");
      }
    }
    
    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [roomUrl, userName, handleJoinedMeeting, handleError, 
      handleParticipantsChange, handleNetworkQualityChange, 
      videoQuality, isMobile, isTV, capabilities.network.connectionQuality]);

  const handleToggleMute = () => {
    if (!callFrame) return;
    setIsMuted(prev => !prev);
    callFrame.setLocalAudio(!isMuted);
  };

  const handleToggleVideo = () => {
    if (!callFrame) return;
    setIsVideoOff(prev => !prev);
    callFrame.setLocalVideo(!isVideoOff);
  };

  const handleToggleScreenShare = async () => {
    if (!callFrame) return;
    
    if (!isScreenSharing) {
      try {
        await callFrame.startScreenShare();
        setIsScreenSharing(true);
      } catch (e) {
        console.error("Error starting screen share:", e);
        toast.error("Failed to start screen sharing");
      }
    } else {
      try {
        await callFrame.stopScreenShare();
        setIsScreenSharing(false);
      } catch (e) {
        console.error("Error stopping screen share:", e);
      }
    }
  };

  const handleToggleRecording = () => {
    if (!callFrame) return;
    
    if (!isRecording) {
      try {
        callFrame.startRecording();
      } catch (e) {
        console.error("Error starting recording:", e);
        toast.error("Failed to start recording");
      }
    } else {
      try {
        callFrame.stopRecording();
      } catch (e) {
        console.error("Error stopping recording:", e);
      }
    }
  };

  const handleQualityChange = (quality: "high" | "medium" | "low") => {
    if (!callFrame) return;
    
    const videoSettings = {
      low: { height: { max: 360 }, frameRate: { max: 15 }, bandwidth: { max: 500000 } },
      medium: { height: { max: 720 }, frameRate: { max: 24 }, bandwidth: { max: 1500000 } },
      high: { height: { max: 1080 }, frameRate: { max: 30 }, bandwidth: { max: 3000000 } }
    };
    
    try {
      callFrame.updateInputSettings({
        video: videoSettings[quality]
      });
      toast.success(`Quality changed to ${quality}`);
    } catch (e) {
      console.error("Error changing video quality:", e);
    }
  };

  const handleLeaveMeeting = () => {
    if (callFrame) {
      callFrame.leave();
    }
    if (onLeave) {
      onLeave();
    }
  };

  return (
    <div className="relative h-full w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div id="video-container" className="relative h-full min-h-[60vh] w-full bg-black/5 rounded-lg overflow-hidden">
        {(!callFrame || !hasJoined || reconnecting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
            <div className="text-center p-4 bg-background/80 backdrop-blur-sm rounded-lg shadow-lg">
              <div className="animate-bounce mb-4">
                <div className="w-4 h-4 bg-primary mx-auto rounded-full"></div>
              </div>
              <p className="font-medium">
                {reconnecting ? "Reconnecting..." : "Joining meeting..."}
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className={`${isMobile ? 'mt-4' : 'absolute bottom-4 left-0 right-0'}`}>
        <VideoControls 
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          currentQuality={videoQuality}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleRecording={handleToggleRecording}
          onQualityChange={handleQualityChange}
        />
        
        <div className="flex justify-center mt-4">
          <Button 
            variant="destructive" 
            onClick={handleLeaveMeeting}
            size={isMobile ? "lg" : "default"}
            className={isTV ? "px-6 py-4 text-lg" : ""}
            data-dpad-focusable={isTV ? "true" : undefined}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Leave Meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
