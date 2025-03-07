import { useState, useEffect, useRef } from "react";
import DailyIframe from '@daily-co/daily-js';
import { Button } from "@/components/ui/button";
import { VideoControls } from "./VideoControls";
import { useBattery } from "@/hooks/use-battery";
import { useNetwork } from "@/hooks/use-network";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Battery, BatteryLow, Tv, XCircle } from "lucide-react";
import { NetworkQualityMetrics } from "@/types/video";
import { useIsTVDevice } from "@/hooks/use-tv-detection";

interface VideoRoomProps {
  meetingUrl: string;
  onLeave?: () => void;
}

export const VideoRoom = ({ meetingUrl, onLeave }: VideoRoomProps) => {
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoQuality, setVideoQuality] = useState<"high" | "medium" | "low">("high");
  const [networkMetrics, setNetworkMetrics] = useState<NetworkQualityMetrics>({});
  const [isFullScreen, setIsFullScreen] = useState(false);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const { batteryLevel, isCharging } = useBattery();
  const { connectionQuality, isOnline } = useNetwork();
  const isTV = useIsTVDevice();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const cssFile = isTV ? '/tv-styles.css' : '';
  
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      iframeContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  useEffect(() => {
    if (!iframeContainerRef.current || !meetingUrl) return;
    
    let initialQuality: "high" | "medium" | "low" = "high";
    if (connectionQuality === "poor") {
      initialQuality = "low";
    } else if (!isCharging && batteryLevel < 0.2) {
      initialQuality = "medium";
    }
    setVideoQuality(initialQuality);
    
    const createCallFrame = () => {
      try {
        const frameOptions: any = {
          url: meetingUrl,
          cssFile,
        };
        
        if (isTV) {
          frameOptions.customLayout = true;
        }
            
        const frame = DailyIframe.createFrame(
          iframeContainerRef.current as HTMLDivElement,
          frameOptions
        );
        
        frame
          .on('joined-meeting', (e: any) => {
            console.log('Joined meeting', e);
            applyVideoQuality(frame, initialQuality);
            
            if (isTV) {
              applyTVLayout(frame);
            }
            
            if (isMobile) {
              applyMobileLayout(frame);
            }
          })
          .on('left-meeting', (e: any) => {
            console.log('Left meeting', e);
            if (onLeave) onLeave();
          })
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
    
    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [meetingUrl, isTV, isMobile]);
  
  useEffect(() => {
    if (batteryLevel < 0.15 && !isCharging && videoQuality !== "low") {
      setVideoQuality("low");
      if (callFrame) {
        applyVideoQuality(callFrame, "low");
      }
    }
  }, [batteryLevel, isCharging]);
  
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
    
    frame.setShowNamesMode('always');
    frame.setShowParticipantsBar(true);
  };
  
  const applyMobileLayout = (frame: any) => {
    try {
      frame.updateParticipant('local', {
        styles: {
          cam: {
            width: '30%',
            height: '30%',
            right: '8px',
            bottom: '8px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }
        }
      });
      
      frame.setShowNamesMode('always');
      frame.setShowParticipantsBar(false);
    } catch (error) {
      console.error('Error applying mobile layout:', error);
    }
  };
  
  const mapNetworkQuality = (threshold: number): NetworkQualityMetrics["quality"] => {
    if (threshold > 80) return "excellent";
    if (threshold > 60) return "good";
    if (threshold > 40) return "fair";
    return "poor";
  };
  
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
  
  const handleLeaveCall = () => {
    if (callFrame) {
      callFrame.leave();
    }
    if (onLeave) {
      onLeave();
    }
  };
  
  return (
    <div className={`flex flex-col w-full ${isTV ? 'tv-layout' : ''} ${isMobile ? 'mobile-layout' : ''}`}>
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
      
      <div className={`relative ${isMobile ? 'mb-20' : ''}`}>
        <div 
          ref={iframeContainerRef} 
          className={`w-full h-[75vh] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 ${
            isTV ? 'h-[85vh] tv-video-container' : ''
          } ${
            isMobile ? 'h-[60vh] touch-manipulation' : ''
          }`}
        ></div>
        
        {isMobile && (
          <Button 
            onClick={toggleFullScreen}
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
          >
            {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          </Button>
        )}
        
        {isMobile && (
          <Button
            onClick={handleLeaveCall}
            variant="destructive"
            size="sm"
            className="absolute top-2 left-2 z-10 bg-destructive/90 backdrop-blur-sm"
          >
            <XCircle className="h-4 w-4 mr-1" /> Leave
          </Button>
        )}
      </div>
      
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
