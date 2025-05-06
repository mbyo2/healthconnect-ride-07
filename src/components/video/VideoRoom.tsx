
import React, { useState, useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VideoControls } from './VideoControls';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";
import { useNetwork } from "@/hooks/use-network";
import { useErrorHandler } from "@/hooks/use-error-handler";

interface VideoRoomProps {
  roomUrl: string;
  userName: string;
  videoQuality?: 'low' | 'medium' | 'high';
  onLeave?: () => void;
}

let callObject: any = null;

export const VideoRoom: React.FC<VideoRoomProps> = ({ 
  roomUrl, 
  userName, 
  videoQuality = 'medium',
  onLeave 
}) => {
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const { isOnline, connectionQuality } = useNetwork();
  const { handleError } = useErrorHandler();
  const recordingRef = useRef<any>(null);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        if (!roomUrl || !videoRef.current) return;

        callObject = DailyIframe.createCallObject({
          dailyConfig: {
            experimentalChromeVideoMuteLightOff: true,
            avoidEval: true,
          }
        });

        callObject.on('joined-meeting', () => {
          console.log('Successfully joined the meeting');
          setJoined(true);
          setNetworkError(null);
          setReconnecting(false);
          toast.success("You have joined the video call");
        });

        callObject.on('left-meeting', () => {
          setJoined(false);
          if (onLeave) {
            onLeave();
          }
        });
        
        // Handle network and reconnection events
        callObject.on('network-quality-change', (event: any) => {
          console.log('Network quality changed:', event);
          // Adapt video quality automatically based on network conditions
          if (event.threshold === 'low' && videoQuality !== 'low') {
            setVideoQuality('low');
            toast.info("Automatically reduced video quality due to poor network");
          }
        });
        
        callObject.on('network-connection', (event: any) => {
          console.log('Network connection event:', event);
          if (event.type === 'interrupted') {
            setReconnecting(true);
            toast.warning("Connection interrupted. Trying to reconnect...", { duration: 10000 });
          } else if (event.type === 'reconnected') {
            setReconnecting(false);
            setNetworkError(null);
            toast.success("Successfully reconnected to the call");
          } else if (event.type === 'failed') {
            handleNetworkFailure("Connection failed. Please check your network and try rejoining.");
          }
        });
        
        callObject.on('error', (event: any) => {
          console.error('Daily.co error:', event);
          handleError(event.errorMsg || "Video call error");
          
          if (event.type === 'network') {
            handleNetworkFailure(event.errorMsg);
          }
        });
        
        callObject.on('recording-started', () => {
          console.log('Recording started');
          setIsRecording(true);
          toast.success("Recording started");
        });
        
        callObject.on('recording-stopped', () => {
          console.log('Recording stopped');
          setIsRecording(false);
          toast.info("Recording stopped");
        });
        
        callObject.on('recording-error', (event: any) => {
          console.error('Recording error:', event);
          setIsRecording(false);
          handleError(event.errorMsg || "Recording error");
        });

        // Join the call
        await callObject.join({ url: roomUrl, userName: userName });
        callObject.setBandwidth({ kbs: 300 });
        callObject.setUserName(userName);
        
        // Set initial video quality
        setVideoQuality(videoQuality);

        if (videoRef.current) {
          videoRef.current.appendChild(callObject.createFrame());
        }
      } catch (error) {
        console.error('Error initializing video call:', error);
        handleError(error, "Failed to initialize video call");
        handleNetworkFailure("Could not connect to the video call");
      }
    };

    initializeCall();

    return () => {
      if (isRecording && callObject) {
        try {
          stopRecording();
        } catch (error) {
          console.error('Error stopping recording during cleanup:', error);
        }
      }
      
      if (callObject) {
        callObject.destroy();
        callObject = null;
      }
    };
  }, [roomUrl, userName, onLeave]);
  
  // Monitor online status changes
  useEffect(() => {
    if (!isOnline && joined) {
      setNetworkError("You appear to be offline. Please check your connection.");
    } else if (isOnline && networkError) {
      // If back online but we had an error, clear it
      setNetworkError(null);
      
      // Attempt to reconnect if we were previously connected
      if (joined && reconnecting && callObject) {
        try {
          callObject.setBandwidth({ kbs: 300 });
          toast.info("Attempting to restore connection...");
        } catch (error) {
          console.error('Error reconnecting:', error);
        }
      }
    }
  }, [isOnline, joined, networkError, reconnecting]);

  const handleNetworkFailure = (message: string) => {
    setNetworkError(message);
    setReconnecting(false);
    toast.error(message, { duration: 10000 });
  };

  const setVideoQuality = (quality: 'low' | 'medium' | 'high') => {
    if (!callObject) return;
    
    try {
      // Update based on quality selection
      switch (quality) {
        case 'low':
          callObject.updateSendSettings({
            video: {
              encodings: {
                maxBitrate: 150000, // 150 kbps
                maxFramerate: 15,
              }
            }
          });
          
          callObject.updateReceiveSettings({
            video: {
              quality: 'low'
            }
          });
          break;
          
        case 'medium':
          callObject.updateSendSettings({
            video: {
              encodings: {
                maxBitrate: 500000, // 500 kbps
                maxFramerate: 25,
              }
            }
          });
          
          callObject.updateReceiveSettings({
            video: {
              quality: 'medium'
            }
          });
          break;
          
        case 'high':
          callObject.updateSendSettings({
            video: {
              encodings: {
                maxBitrate: 2500000, // 2.5 Mbps
                maxFramerate: 30,
              }
            }
          });
          
          callObject.updateReceiveSettings({
            video: {
              quality: 'high'
            }
          });
          break;
      }
    } catch (error) {
      console.error('Error setting video quality:', error);
      handleError(error, "Failed to adjust video quality");
    }
  };
  
  const handleToggleMute = () => {
    if (!callObject) return;
    
    try {
      callObject.setLocalAudio(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
      handleError(error, "Failed to toggle audio");
    }
  };
  
  const handleToggleVideo = () => {
    if (!callObject) return;
    
    try {
      callObject.setLocalVideo(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    } catch (error) {
      console.error('Error toggling video:', error);
      handleError(error, "Failed to toggle video");
    }
  };
  
  const handleToggleScreenShare = () => {
    if (!callObject) return;
    
    try {
      if (!isScreenSharing) {
        callObject.startScreenShare()
          .then(() => setIsScreenSharing(true))
          .catch((error: any) => {
            console.error('Error starting screen share:', error);
            handleError(error, "Failed to start screen sharing");
          });
      } else {
        callObject.stopScreenShare()
          .then(() => setIsScreenSharing(false))
          .catch((error: any) => {
            console.error('Error stopping screen share:', error);
            handleError(error, "Failed to stop screen sharing");
          });
      }
    } catch (error) {
      console.error('Error with screen sharing:', error);
      handleError(error, "Screen sharing error");
    }
  };
  
  const startRecording = async () => {
    if (!callObject) return;
    
    try {
      // Start recording - store the recording in the ref for later access
      recordingRef.current = await callObject.startRecording();
      console.log('Started recording:', recordingRef.current);
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error('Error starting recording:', error);
      handleError(error, "Failed to start recording");
    }
  };
  
  const stopRecording = async () => {
    if (!callObject || !recordingRef.current) return;
    
    try {
      await callObject.stopRecording(recordingRef.current.id);
      console.log('Stopped recording:', recordingRef.current.id);
      recordingRef.current = null;
      setIsRecording(false);
      toast.success("Recording stopped. It will be available shortly.");
    } catch (error) {
      console.error('Error stopping recording:', error);
      handleError(error, "Failed to stop recording");
    }
  };
  
  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const handleQualityChange = (quality: 'low' | 'medium' | 'high') => {
    setVideoQuality(quality);
    toast.success(`Video quality set to ${quality}`);
  };

  const handleLeave = () => {
    try {
      if (isRecording) {
        stopRecording();
      }
      
      if (callObject) {
        callObject.leave();
        toast.success("You have left the video call");
      }
      
      if (onLeave) {
        onLeave();
      }
    } catch (error) {
      console.error('Error leaving call:', error);
      handleError(error, "Error leaving the call");
      
      // Force onLeave even if there was an error
      if (onLeave) {
        onLeave();
      }
    }
  };
  
  const handleRetryConnection = () => {
    if (!callObject) return;
    
    setReconnecting(true);
    toast.info("Attempting to reconnect...");
    
    try {
      // Try to reconnect by rejoining
      callObject.leave()
        .then(() => {
          setTimeout(() => {
            callObject.join({ url: roomUrl, userName })
              .catch((error: any) => {
                console.error('Error rejoining call:', error);
                handleError(error, "Failed to rejoin the call");
              });
          }, 1000);
        })
        .catch((error: any) => {
          console.error('Error leaving call before rejoin:', error);
          handleError(error, "Connection error");
        });
    } catch (error) {
      console.error('Error in reconnection flow:', error);
      handleError(error, "Failed to reconnect");
    }
  };

  return (
    <div className="space-y-4">
      {networkError && (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Connection Problem</AlertTitle>
          <AlertDescription>{networkError}</AlertDescription>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRetryConnection}
            className="mt-2"
          >
            Retry Connection
          </Button>
        </Alert>
      )}
      
      <div ref={videoRef} style={{ width: '100%', height: '600px' }} className={reconnecting ? "opacity-50" : ""} />
      
      {reconnecting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/80 p-6 rounded-lg shadow-lg text-center">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Reconnecting...</h3>
            <p className="text-muted-foreground">Please wait while we restore your connection.</p>
          </div>
        </div>
      )}
      
      {joined && (
        <>
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
          
          <Button onClick={handleLeave} variant="destructive" className="mt-4">
            Leave Call
          </Button>
        </>
      )}
    </div>
  );
};
