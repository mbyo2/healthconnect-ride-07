import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, Phone, MessageSquare, Settings, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { webrtcService, VideoCallSession, CallQuality } from '../../utils/webrtc-service';
import { logger } from '../../utils/logger';

interface VideoConsultationProps {
  appointmentId: string;
  isDoctor: boolean;
  onCallEnd?: () => void;
}

export const VideoConsultation: React.FC<VideoConsultationProps> = ({
  appointmentId,
  isDoctor,
  onCallEnd
}) => {
  const [session, setSession] = useState<VideoCallSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [callQuality, setCallQuality] = useState<CallQuality | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    initializeCall();
    setupEventListeners();

    return () => {
      webrtcService.endCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      const callSession = await webrtcService.createVideoCall(appointmentId, isDoctor);
      setSession(callSession);
      
      // Get user media and display in local video
      const stream = await webrtcService.getUserMedia();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      logger.info('Video consultation initialized', 'VIDEO_CONSULTATION');
    } catch (error) {
      logger.error('Failed to initialize video call', 'VIDEO_CONSULTATION', error);
    }
  };

  const setupEventListeners = () => {
    webrtcService.onRemoteStreamReceived = (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setIsConnected(true);
    };

    webrtcService.onChatMessage = (message: any) => {
      setChatMessages(prev => [...prev, message]);
    };

    webrtcService.onQualityUpdate = (quality: CallQuality) => {
      setCallQuality(quality);
    };

    webrtcService.onScreenShareStart = (participantId: string) => {
      setScreenSharing(true);
    };

    webrtcService.onScreenShareStop = (participantId: string) => {
      setScreenSharing(false);
    };
  };

  const handleToggleAudio = async () => {
    const newState = !audioEnabled;
    await webrtcService.toggleAudio(newState);
    setAudioEnabled(newState);
  };

  const handleToggleVideo = async () => {
    const newState = !videoEnabled;
    await webrtcService.toggleVideo(newState);
    setVideoEnabled(newState);
  };

  const handleScreenShare = async () => {
    try {
      if (screenSharing) {
        await webrtcService.stopScreenShare();
      } else {
        await webrtcService.startScreenShare();
      }
    } catch (error) {
      logger.error('Screen share toggle failed', 'VIDEO_CONSULTATION', error);
    }
  };

  const handleEndCall = async () => {
    await webrtcService.endCall();
    onCallEnd?.();
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      webrtcService.sendChatMessage(newMessage);
      setNewMessage('');
    }
  };

  const getConnectionStatus = () => {
    if (!session) return 'Initializing...';
    
    switch (session.status) {
      case 'waiting': return 'Waiting for connection...';
      case 'active': return 'Connected';
      case 'ended': return 'Call ended';
      case 'failed': return 'Connection failed';
      default: return 'Unknown';
    }
  };

  const getQualityIndicator = () => {
    if (!callQuality) return null;

    const { network } = callQuality;
    let quality = 'good';
    let color = 'bg-green-500';

    if (network.packetLoss > 0.05 || network.rtt > 200) {
      quality = 'poor';
      color = 'bg-red-500';
    } else if (network.packetLoss > 0.02 || network.rtt > 100) {
      quality = 'fair';
      color = 'bg-yellow-500';
    }

    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs text-muted-foreground capitalize">{quality}</span>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Video Consultation</h1>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {getConnectionStatus()}
          </Badge>
          {getQualityIndicator()}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatVisible(!chatVisible)}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Button>
          <Button variant="ghost" size="sm">
            <Users className="h-4 w-4" />
            Participants
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local Video */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Screen Sharing Indicator */}
        {screenSharing && (
          <div className="absolute top-4 left-4">
            <Alert className="bg-blue-500 text-white border-blue-600">
              <Monitor className="h-4 w-4" />
              <AlertDescription>Screen sharing active</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && session?.status === 'waiting' && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Waiting for Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Waiting for the other participant to join...
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={audioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={handleToggleAudio}
            className="rounded-full w-12 h-12"
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={videoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={handleToggleVideo}
            className="rounded-full w-12 h-12"
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={screenSharing ? "default" : "outline"}
            size="lg"
            onClick={handleScreenShare}
            className="rounded-full w-12 h-12"
          >
            <Monitor className="h-5 w-5" />
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full w-12 h-12"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>

        {/* Call Quality Info */}
        {callQuality && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Video: {callQuality.video.resolution} @ {callQuality.video.frameRate}fps | 
            Network: {Math.round(callQuality.network.rtt)}ms RTT, {Math.round(callQuality.network.packetLoss * 100)}% loss
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      {chatVisible && (
        <div className="absolute right-0 top-16 bottom-20 w-80 bg-white border-l shadow-lg">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Chat</h3>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              {chatMessages.map((msg, index) => (
                <div key={index} className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="bg-gray-100 rounded-lg p-2 text-sm">
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConsultation;
