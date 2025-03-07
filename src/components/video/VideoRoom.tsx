
import { useState, useEffect, useRef } from "react";
import DailyIframe from '@daily-co/daily-js';
import { Button } from "@/components/ui/button";
import { VideoControls } from "./VideoControls";
import { useBattery } from "@/hooks/use-battery";
import { useNetwork } from "@/hooks/use-network";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Battery, BatteryLow, Tv } from "lucide-react";
import { NetworkQualityMetrics } from "@/types/video";
import { useIsTVDevice } from "@/hooks/use-tv-detection";

interface VideoRoomProps {
  meetingUrl: string;
}

export const VideoRoom = ({ meetingUrl }: VideoRoomProps) => {
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoQuality, setVideoQuality] = useState<"high" | "medium" | "low">("high");
  const [networkMetrics, setNetworkMetrics] = useState<NetworkQualityMetrics>({});
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const { batteryLevel, isCharging } = useBattery();
  const { connectionQuality, isOnline } = useNetwork();
  const isTV = useIsTVDevice();
  const cssFile = isTV ? '/tv-styles.css' : '';
  
  useEffect(() => {
    if (!iframeContainerRef.current || !meetingUrl) return;
    
    // Determine initial quality based on network and battery
    let initialQuality: "high" | "medium" | "low" = "high";
    if (connectionQuality === "poor") {
      initialQuality = "low";
    } else if (!isCharging && batteryLevel < 0.2) {
      initialQuality = "medium";
    }
    setVideoQuality(initialQuality);
    
    // Create call frame
    const createCallFrame = () => {
      try {
        // Configure frame options based on device type
        const frameOptions: any = {
          url: meetingUrl,
          cssFile,
        };
        
        // Add TV-specific options if on a TV device
        if (isTV) {
          frameOptions.customLayout = true;
        }
            
        // Create the call frame
        const frame = DailyIframe.createFrame(
          iframeContainerRef.current as HTMLDivElement,
          frameOptions
        );
        
        // Join with initial quality settings
        frame
          .on('joined-meeting', (e: any) => {
            console.log('Joined meeting', e);
            applyVideoQuality(frame, initialQuality);
            
            // Check if device is TV and apply TV layout
            if (isTV) {
              applyTVLayout(frame);
            }
          })
          .on('left-meeting', (e: any) => console.log('Left meeting', e))
          .on('error', (e: any) => console.error('Daily error', e))
          .on('network-quality-change', (e: any) => {
            console.log('Network quality changed', e);
            setNetworkMetrics({
              downlink: e.downlinkKbps,
              uplink: e.uplinkKbps,
              packetLoss: e.packetLoss,
              quality: mapNetworkQuality(e.threshold)
            });
          })
          .join({ url: meetingUrl });
        
        setCallFrame(frame);
      } catch (error) {
        console.error('Error creating Daily call frame:', error);
      }
    };
    
    createCallFrame();
    
    // Cleanup
    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [meetingUrl, isTV]);
  
  // Check for low battery
  useEffect(() => {
    if (batteryLevel < 0.15 && !isCharging && videoQuality !== "low") {
      setVideoQuality("low");
      if (callFrame) {
        applyVideoQuality(callFrame, "low");
      }
    }
  }, [batteryLevel, isCharging]);
  
  // Apply TV layout to the call
  const applyTVLayout = (frame: any) => {
    frame.updateParticipant('local', {
      styles: {
        cam: {
          width: '20%',
          height: '20%',
          right: '2%',
          top: '2%',
          borderRadius: '8px',
        }
      }
    });
    
    // Make remote participants larger
    frame.setShowNamesMode('always');
    frame.setShowParticipantsBar(true);
  };
  
  // Convert network quality threshold to a readable quality level
  const mapNetworkQuality = (threshold: number): NetworkQualityMetrics["quality"] => {
    if (threshold > 80) return "excellent";
    if (threshold > 60) return "good";
    if (threshold > 40) return "fair";
    return "poor";
  };
  
  // Apply video quality settings
  const applyVideoQuality = (frame: any, quality: "high" | "medium" | "low") => {
    if (!frame) return;
    
    try {
      const qualities = {
        high: { video: { encodings: { maxBitrate: 2800000, maxFramerate: 30 } } },
        medium: { video: { encodings: { maxBitrate: 1000000, maxFramerate: 25 } } },
        low: { video: { encodings: { maxBitrate: 350000, maxFramerate: 15 } } }
      };
      
      frame.updateInputSettings(qualities[quality]);
      console.log(`Applied ${quality} video quality settings`);
    } catch (error) {
      console.error('Error applying video quality settings:', error);
    }
  };
  
  const handleToggleMute = () => {
    if (!callFrame) return;
    callFrame.setLocalAudio(!isMuted);
    setIsMuted(!isMuted);
  };
  
  const handleToggleVideo = () => {
    if (!callFrame) return;
    callFrame.setLocalVideo(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };
  
  const handleToggleScreenShare = () => {
    if (!callFrame) return;
    if (isScreenSharing) {
      callFrame.stopScreenShare();
    } else {
      callFrame.startScreenShare();
    }
    setIsScreenSharing(!isScreenSharing);
  };
  
  const handleQualityChange = (quality: "high" | "medium" | "low") => {
    setVideoQuality(quality);
    if (callFrame) {
      applyVideoQuality(callFrame, quality);
    }
  };
  
  return (
    <div className={`flex flex-col w-full ${isTV ? 'tv-layout' : ''}`}>
      {batteryLevel < 0.15 && !isCharging && (
        <Alert className="mb-4">
          <BatteryLow className="h-4 w-4" />
          <AlertTitle>Low Battery</AlertTitle>
          <AlertDescription>
            Battery level is low. Video quality has been reduced to save power.
          </AlertDescription>
        </Alert>
      )}
      
      {isTV && (
        <div className="tv-indicator mb-4 flex items-center justify-center p-2 bg-blue-100 dark:bg-blue-900 rounded">
          <Tv className="h-5 w-5 mr-2" />
          <span>TV Mode Active - Use remote control for navigation</span>
        </div>
      )}
      
      <div 
        ref={iframeContainerRef} 
        className={`w-full h-[75vh] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 ${
          isTV ? 'h-[85vh] tv-video-container' : ''
        }`}
      ></div>
      
      <VideoControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        currentQuality={videoQuality}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onQualityChange={handleQualityChange}
      />
    </div>
  );
};
