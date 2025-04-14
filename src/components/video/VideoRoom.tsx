import React, { useState, useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VideoRoomProps {
  roomUrl: string;
  userName: string;
  videoQuality: 'low' | 'medium' | 'high';
}

let callObject: any = null;

export const VideoRoom: React.FC<VideoRoomProps> = ({ roomUrl, userName, videoQuality }) => {
  const [joined, setJoined] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeCall = async () => {
      if (!roomUrl || !videoRef.current) return;

      callObject = DailyIframe.createCallObject();

      callObject.on('joined-meeting', () => {
        setJoined(true);
      });

      callObject.on('left-meeting', () => {
        setJoined(false);
      });

      callObject.join({ url: roomUrl, userName: userName });
      callObject.setBandwidth({ kbs: 300 });
      callObject.setUserName(userName);
      
      // Set initial video quality
      setVideoQuality(videoQuality);

      if (videoRef.current) {
        videoRef.current.appendChild(callObject.createFrame());
      }
    };

    initializeCall();

    return () => {
      if (callObject) {
        callObject.destroy();
        callObject = null;
      }
    };
  }, [roomUrl, userName, videoQuality]);

  // Fix the video quality settings to use the correct property names
  const setVideoQuality = (quality: 'low' | 'medium' | 'high') => {
    if (!callObject) return;
    
    // Update based on quality selection
    switch (quality) {
      case 'low':
        callObject.updateSendSettings({
          video: {
            // Fix: change 'encoding' to 'encodings'
            encodings: {
              maxBitrate: 150000, // 150 kbps
              maxFramerate: 15,
            }
          }
        });
        
        callObject.updateReceiveSettings({
          video: {
            // Fix: remove 'maxBitrate' as it's not in DailyVideoReceiveSettingsUpdates
            // Just set general quality level
            quality: 'low'
          }
        });
        break;
        
      case 'medium':
        callObject.updateSendSettings({
          video: {
            // Fix: change 'encoding' to 'encodings'
            encodings: {
              maxBitrate: 500000, // 500 kbps
              maxFramerate: 25,
            }
          }
        });
        
        callObject.updateReceiveSettings({
          video: {
            // Fix: remove 'maxBitrate' as it's not in DailyVideoReceiveSettingsUpdates
            // Just set general quality level
            quality: 'medium'
          }
        });
        break;
        
      case 'high':
        callObject.updateSendSettings({
          video: {
            // Fix: change 'encoding' to 'encodings'
            encodings: {
              maxBitrate: 2500000, // 2.5 Mbps
              maxFramerate: 30,
            }
          }
        });
        
        callObject.updateReceiveSettings({
          video: {
            // Fix: remove 'maxBitrate' as it's not in DailyVideoReceiveSettingsUpdates
            // Just set general quality level
            quality: 'high'
          }
        });
        break;
    }
  };

  const handleLeave = () => {
    if (callObject) {
      callObject.leave();
      toast.success("You have left the video call.");
    }
  };

  return (
    <div>
      <div ref={videoRef} style={{ width: '100%', height: '600px' }} />
      {joined && (
        <Button onClick={handleLeave} className="mt-4">
          Leave Call
        </Button>
      )}
    </div>
  );
};
