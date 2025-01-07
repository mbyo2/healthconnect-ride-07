import { useEffect, useRef } from "react";
import DailyIframe from "@daily-co/daily-js";
import { VideoControls } from "./VideoControls";
import { useState } from "react";
import { toast } from "sonner";

interface VideoRoomProps {
  meetingUrl: string;
}

export const VideoRoom = ({ meetingUrl }: VideoRoomProps) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    if (!videoContainerRef.current) return;

    const initializeCall = async () => {
      try {
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

        await callFrame.join({ url: meetingUrl });

        callFrame.on('left-meeting', () => {
          toast.info("Left the video consultation");
          if (callFrameRef.current) {
            callFrameRef.current.destroy();
            callFrameRef.current = null;
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
  }, [meetingUrl]);

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

  return (
    <div className="space-y-4">
      <div 
        ref={videoContainerRef} 
        className="w-full aspect-video bg-gray-100 rounded-lg"
      />
      
      {callFrameRef.current && (
        <VideoControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
        />
      )}
    </div>
  );
};