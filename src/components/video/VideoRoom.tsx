
import { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { VideoControls } from "./VideoControls";
import { toast } from "sonner";
import { useNetwork } from "@/hooks/use-network";
import { useBattery } from "@/hooks/use-battery";

interface VideoRoomProps {
  meetingUrl: string;
}

export const VideoRoom = ({ meetingUrl }: VideoRoomProps) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoQuality, setVideoQuality] = useState<"high" | "medium" | "low">("high");
  const { isOnline, connectionType, connectionQuality } = useNetwork();
  const { batteryLevel, isCharging } = useBattery();

  // Adjust video quality based on network and battery conditions
  useEffect(() => {
    if (!callFrameRef.current) return;

    // Network-based quality adjustments
    if (connectionQuality === "poor" || connectionType === "cellular") {
      setVideoQuality("low");
      if (!isVideoOff && !isCharging && batteryLevel < 0.2) {
        // Auto turn off video on poor connection + low battery + not charging
        toggleVideo();
        toast.info("Video turned off to save battery on poor connection");
      }
    } else if (connectionQuality === "fair" || (connectionType === "cellular" && batteryLevel < 0.3)) {
      setVideoQuality("medium");
    } else {
      setVideoQuality("high");
    }

    // Apply quality settings to the call
    if (callFrameRef.current) {
      const qualitySettings = {
        high: { video: { quality: 'high' } },
        medium: { video: { quality: 'medium' } },
        low: { video: { quality: 'low', fps: 15 } }
      };
      
      callFrameRef.current.updateInputSettings(qualitySettings[videoQuality]);
    }
  }, [connectionQuality, connectionType, isCharging, batteryLevel, isVideoOff]);

  // Network status change monitor
  useEffect(() => {
    if (!isOnline && callFrameRef.current) {
      toast.warning("Network connection lost. Attempting to reconnect...");
    }
  }, [isOnline]);

  useEffect(() => {
    if (!videoContainerRef.current) return;

    const initializeCall = async () => {
      try {
        // Low battery optimization
        const isLowBattery = batteryLevel < 0.15 && !isCharging;
        
        const callFrame = DailyIframe.createFrame(videoContainerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '12px',
          },
          showLeaveButton: true,
          showFullscreenButton: true,
        });

        callFrameRef.current = callFrame;

        // Configure initial call properties based on device state
        const callProperties = {
          url: meetingUrl,
          cssFile: "video-call.css",
          dailyConfig: {
            experimentalChromeVideoMuteLightOff: true, // Reduces power consumption when video is off
          }
        };

        // Apply low battery/network optimizations immediately if needed
        if (isLowBattery || connectionQuality === "poor" || connectionType === "cellular") {
          setIsVideoOff(true);
          await callFrame.join({
            ...callProperties,
            videoSource: false,
          });
          toast.info("Video disabled to optimize for battery/network");
        } else {
          await callFrame.join(callProperties);
        }

        callFrame.on('left-meeting', () => {
          toast.info("Left the video consultation");
          if (callFrameRef.current) {
            callFrameRef.current.destroy();
            callFrameRef.current = null;
          }
        });

        // Add network quality monitoring
        callFrame.on('network-quality-change', (event: any) => {
          console.log("Network quality changed:", event);
          if (event.threshold === 'low') {
            toast.warning("Network quality is poor. Video quality reduced.");
            if (!isVideoOff && batteryLevel < 0.3) {
              toggleVideo();
            }
          }
        });

      } catch (error: any) {
        toast.error("Error joining video call: " + error.message);
      }
    };

    initializeCall();

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, [meetingUrl, batteryLevel, isCharging, connectionQuality, connectionType]);

  const toggleMute = () => {
    if (!callFrameRef.current) return;
    callFrameRef.current.setLocalAudio(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!callFrameRef.current) return;
    callFrameRef.current.setLocalVideo(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const toggleScreenShare = async () => {
    if (!callFrameRef.current) return;
    try {
      if (isScreenSharing) {
        await callFrameRef.current.stopScreenShare();
      } else {
        await callFrameRef.current.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error: any) {
      toast.error("Error toggling screen share: " + error.message);
    }
  };

  // Manual quality override function
  const setQualityManually = (quality: "high" | "medium" | "low") => {
    setVideoQuality(quality);
    if (callFrameRef.current) {
      const qualitySettings = {
        high: { video: { quality: 'high' } },
        medium: { video: { quality: 'medium' } },
        low: { video: { quality: 'low', fps: 15 } }
      };
      
      callFrameRef.current.updateInputSettings(qualitySettings[quality]);
      toast.success(`Video quality set to ${quality}`);
    }
  };

  return (
    <div className="space-y-4">
      {!isOnline && (
        <div className="bg-yellow-100 text-yellow-800 p-2 rounded-md mb-2 flex items-center justify-center">
          <p>You are offline. The call will reconnect when your connection returns.</p>
        </div>
      )}
      
      {batteryLevel < 0.15 && !isCharging && (
        <div className="bg-red-100 text-red-800 p-2 rounded-md mb-2 flex items-center justify-center">
          <p>Low battery ({Math.round(batteryLevel * 100)}%). Consider charging your device.</p>
        </div>
      )}
      
      <div 
        ref={videoContainerRef} 
        className="w-full aspect-video bg-gray-100 rounded-lg"
      />
      
      {callFrameRef.current && (
        <>
          <VideoControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            currentQuality={videoQuality}
            onQualityChange={setQualityManually}
          />
          
          <div className="text-xs text-gray-500 flex justify-between items-center">
            <div>
              Network: {connectionType || 'unknown'} 
              {connectionQuality && ` (${connectionQuality})`}
            </div>
            <div>
              Battery: {batteryLevel ? `${Math.round(batteryLevel * 100)}%` : 'unknown'}
              {isCharging ? ' (charging)' : ''}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
