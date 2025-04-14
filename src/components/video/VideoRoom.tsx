
import { useEffect, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { VideoControls } from "./VideoControls";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/hooks/use-network";
import { useDeviceCapabilities } from "@/hooks/use-device-capabilities";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Battery, Signal } from "lucide-react";

interface VideoRoomProps {
  meetingUrl: string;
  onLeave: () => void;
}

export const VideoRoom = ({ meetingUrl, onLeave }: VideoRoomProps) => {
  const [callFrame, setCallFrame] = useState<DailyIframe.DailyCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [quality, setQuality] = useState<"high" | "medium" | "low">("high");
  const { connectionQuality } = useNetwork();
  const capabilities = useDeviceCapabilities();
  
  useEffect(() => {
    // Set initial video quality based on connection
    if (connectionQuality === "poor") {
      setQuality("low");
    } else if (connectionQuality === "average") {
      setQuality("medium");
    }
  }, [connectionQuality]);
  
  useEffect(() => {
    // Initialize meeting
    if (!meetingUrl) return;
    
    const options: any = {
      url: meetingUrl,
      showLeaveButton: true,
      showFullscreenButton: true,
      iframeStyle: {
        height: '100%',
        width: '100%',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'black',
      }
    };
    
    // Adjust quality settings based on connection
    if (quality === "low") {
      options.videoSendSettings = {
        encoding: { maxBitrate: 150_000, maxFramerate: 15 }
      };
      options.videoReceiveSettings = {
        encoding: { maxBitrate: 150_000, maxFramerate: 15 }
      };
    } else if (quality === "medium") {
      options.videoSendSettings = {
        encoding: { maxBitrate: 500_000, maxFramerate: 25 }
      };
    }
    
    // On low battery, reduce quality
    if (capabilities.battery.level !== null && capabilities.battery.level < 0.2 && !capabilities.battery.charging) {
      options.videoSendSettings = {
        encoding: { maxBitrate: 150_000, maxFramerate: 15 }
      };
    }
    
    try {
      const dailyFrame = DailyIframe.createFrame(
        document.getElementById('video-container') as HTMLElement,
        options
      );
      
      dailyFrame
        .on('loaded', () => {
          console.log('Video frame loaded');
          dailyFrame.join();
        })
        .on('joining-meeting', () => {
          console.log('Joining meeting');
        })
        .on('joined-meeting', () => {
          console.log('Joined meeting');
        })
        .on('left-meeting', () => {
          console.log('Left meeting');
          onLeave();
        })
        .on('participant-updated', (event: any) => {
          if (event.participant.local) {
            setIsMuted(event.participant.audio === false);
            setIsVideoOff(event.participant.video === false);
            setIsScreenSharing(event.participant.screen === true);
          }
        });
      
      setCallFrame(dailyFrame);
    } catch (error) {
      console.error('Error setting up video call:', error);
    }
    
    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [meetingUrl, quality]);
  
  const handleToggleMute = () => {
    if (!callFrame) return;
    if (isMuted) {
      callFrame.setLocalAudio(true);
    } else {
      callFrame.setLocalAudio(false);
    }
  };
  
  const handleToggleVideo = () => {
    if (!callFrame) return;
    if (isVideoOff) {
      callFrame.setLocalVideo(true);
    } else {
      callFrame.setLocalVideo(false);
    }
  };
  
  const handleToggleScreenShare = () => {
    if (!callFrame) return;
    if (isScreenSharing) {
      callFrame.stopScreenShare();
    } else {
      callFrame.startScreenShare();
    }
  };
  
  const handleQualityChange = (newQuality: "high" | "medium" | "low") => {
    setQuality(newQuality);
    
    if (!callFrame) return;
    
    if (newQuality === "low") {
      callFrame.updateSendSettings({
        video: {
          encoding: { maxBitrate: 150_000, maxFramerate: 15 }
        }
      });
      callFrame.updateReceiveSettings({
        video: {
          encoding: { maxBitrate: 150_000, maxFramerate: 15 }
        }
      });
    } else if (newQuality === "medium") {
      callFrame.updateSendSettings({
        video: {
          encoding: { maxBitrate: 500_000, maxFramerate: 25 }
        }
      });
      callFrame.updateReceiveSettings({
        video: {
          encoding: { maxBitrate: 750_000 }
        }
      });
    } else {
      callFrame.updateSendSettings({
        video: {
          encoding: { maxBitrate: 1_200_000, maxFramerate: 30 }
        }
      });
      callFrame.updateReceiveSettings({
        video: {
          encoding: { maxBitrate: 2_500_000 }
        }
      });
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <Card className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
        <div id="video-container" className="h-full w-full" />
        
        {capabilities.battery.level !== null && capabilities.battery.level < 0.15 && !capabilities.battery.charging && (
          <div className="absolute top-2 left-2 bg-red-500/80 text-white px-3 py-1 rounded-full text-xs flex items-center">
            <Battery className="h-3 w-3 mr-1" /> Low battery
          </div>
        )}
        
        {connectionQuality === "poor" && (
          <div className="absolute top-2 right-2 bg-yellow-500/80 text-white px-3 py-1 rounded-full text-xs flex items-center">
            <Signal className="h-3 w-3 mr-1" /> Poor connection
          </div>
        )}
      </Card>
      
      <VideoControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        currentQuality={quality}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onQualityChange={handleQualityChange}
      />
      
      <Button 
        variant="destructive" 
        onClick={() => {
          if (callFrame) {
            callFrame.leave();
          } else {
            onLeave();
          }
        }}
        className="w-full"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Leave Meeting
      </Button>
    </div>
  );
};
