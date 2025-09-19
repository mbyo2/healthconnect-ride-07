import { logger } from './logger';
import { errorHandler } from './error-handler';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface VideoCallSession {
  id: string;
  roomId: string;
  participants: Participant[];
  status: 'waiting' | 'active' | 'ended' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  recordingEnabled: boolean;
  screenSharingActive: boolean;
  chatEnabled: boolean;
}

export interface Participant {
  id: string;
  name: string;
  role: 'patient' | 'doctor' | 'nurse' | 'admin';
  isHost: boolean;
  isConnected: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  joinedAt?: Date;
  leftAt?: Date;
}

export interface MediaDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}

export interface CallQuality {
  video: {
    resolution: string;
    frameRate: number;
    bitrate: number;
  };
  audio: {
    bitrate: number;
    sampleRate: number;
  };
  network: {
    rtt: number;
    packetLoss: number;
    bandwidth: number;
  };
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private currentSession: VideoCallSession | null = null;
  private isHost: boolean = false;
  private mediaDevices: MediaDevices = { cameras: [], microphones: [], speakers: [] };
  private qualityMonitor: any = null;

  // STUN/TURN servers configuration
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production
    // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
  ];

  constructor() {
    this.initializeMediaDevices();
  }

  private async initializeMediaDevices(): Promise<void> {
    try {
      if (!navigator.mediaDevices) {
        throw new Error('Media devices not supported');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.mediaDevices = {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };

      logger.info('Media devices initialized', 'WEBRTC', {
        cameras: this.mediaDevices.cameras.length,
        microphones: this.mediaDevices.microphones.length,
        speakers: this.mediaDevices.speakers.length
      });
    } catch (error) {
      errorHandler.handleError(error, 'initializeMediaDevices');
    }
  }

  async createVideoCall(appointmentId: string, isHost: boolean = false): Promise<VideoCallSession> {
    try {
      this.isHost = isHost;
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10
      });

      // Set up event listeners
      this.setupPeerConnectionListeners();

      // Create data channel for chat and control messages
      if (isHost) {
        this.dataChannel = this.peerConnection.createDataChannel('healthconnect', {
          ordered: true
        });
        this.setupDataChannelListeners(this.dataChannel);
      } else {
        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannelListeners(this.dataChannel);
        };
      }

      // Get user media
      await this.getUserMedia();

      // Create session
      const session: VideoCallSession = {
        id: `session-${Date.now()}`,
        roomId: appointmentId,
        participants: [],
        status: 'waiting',
        recordingEnabled: false,
        screenSharingActive: false,
        chatEnabled: true
      };

      this.currentSession = session;

      // Store session in database
      await this.storeSession(session);

      logger.info('Video call session created', 'WEBRTC', { sessionId: session.id, isHost });
      return session;
    } catch (error) {
      errorHandler.handleError(error, 'createVideoCall');
      throw error;
    }
  }

  private setupPeerConnectionListeners(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStreamReceived?.(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      logger.info(`Connection state changed: ${state}`, 'WEBRTC');
      
      if (state === 'connected') {
        this.updateSessionStatus('active');
        this.startQualityMonitoring();
      } else if (state === 'disconnected' || state === 'failed') {
        this.updateSessionStatus('ended');
        this.stopQualityMonitoring();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      logger.info(`ICE connection state: ${state}`, 'WEBRTC');
    };
  }

  private setupDataChannelListeners(channel: RTCDataChannel): void {
    channel.onopen = () => {
      logger.info('Data channel opened', 'WEBRTC');
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch (error) {
        logger.error('Failed to parse data channel message', 'WEBRTC', error);
      }
    };

    channel.onerror = (error) => {
      logger.error('Data channel error', 'WEBRTC', error);
    };
  }

  private handleDataChannelMessage(message: any): void {
    switch (message.type) {
      case 'chat':
        this.onChatMessage?.(message.data);
        break;
      case 'screen-share-start':
        this.onScreenShareStart?.(message.participantId);
        break;
      case 'screen-share-stop':
        this.onScreenShareStop?.(message.participantId);
        break;
      case 'recording-start':
        this.onRecordingStart?.();
        break;
      case 'recording-stop':
        this.onRecordingStop?.();
        break;
    }
  }

  async getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );

      this.localStream = stream;

      // Add tracks to peer connection
      if (this.peerConnection) {
        stream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, stream);
        });
      }

      logger.info('User media obtained', 'WEBRTC', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });

      return stream;
    } catch (error) {
      errorHandler.handleError(error, 'getUserMedia');
      throw error;
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      // Replace video track
      if (this.peerConnection && this.localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

        // Handle screen share end
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      // Notify other participants
      this.sendDataChannelMessage({
        type: 'screen-share-start',
        participantId: 'current-user'
      });

      if (this.currentSession) {
        this.currentSession.screenSharingActive = true;
      }

      logger.info('Screen sharing started', 'WEBRTC');
      return screenStream;
    } catch (error) {
      errorHandler.handleError(error, 'startScreenShare');
      throw error;
    }
  }

  async stopScreenShare(): Promise<void> {
    try {
      if (this.peerConnection && this.localStream) {
        // Get original video track
        const videoTrack = this.localStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );

        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }

      // Notify other participants
      this.sendDataChannelMessage({
        type: 'screen-share-stop',
        participantId: 'current-user'
      });

      if (this.currentSession) {
        this.currentSession.screenSharingActive = false;
      }

      logger.info('Screen sharing stopped', 'WEBRTC');
    } catch (error) {
      errorHandler.handleError(error, 'stopScreenShare');
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    try {
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = enabled;
        });
      }

      logger.info(`Audio ${enabled ? 'enabled' : 'disabled'}`, 'WEBRTC');
    } catch (error) {
      errorHandler.handleError(error, 'toggleAudio');
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    try {
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
          track.enabled = enabled;
        });
      }

      logger.info(`Video ${enabled ? 'enabled' : 'disabled'}`, 'WEBRTC');
    } catch (error) {
      errorHandler.handleError(error, 'toggleVideo');
    }
  }

  async switchCamera(deviceId: string): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        video: { deviceId: { exact: deviceId } },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = newStream.getVideoTracks()[0];

      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      // Stop old video track
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => track.stop());
      }

      logger.info('Camera switched', 'WEBRTC', { deviceId });
    } catch (error) {
      errorHandler.handleError(error, 'switchCamera');
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      logger.info('Offer created', 'WEBRTC');
      return offer;
    } catch (error) {
      errorHandler.handleError(error, 'createOffer');
      throw error;
    }
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      logger.info('Answer created', 'WEBRTC');
      return answer;
    } catch (error) {
      errorHandler.handleError(error, 'createAnswer');
      throw error;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      await this.peerConnection.setRemoteDescription(answer);
      logger.info('Answer handled', 'WEBRTC');
    } catch (error) {
      errorHandler.handleError(error, 'handleAnswer');
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      errorHandler.handleError(error, 'addIceCandidate');
    }
  }

  sendChatMessage(message: string): void {
    this.sendDataChannelMessage({
      type: 'chat',
      data: {
        message,
        timestamp: new Date().toISOString(),
        sender: 'current-user'
      }
    });
  }

  private sendDataChannelMessage(message: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  private sendSignalingMessage(message: any): void {
    // In production, this would send through your signaling server
    // For now, we'll use Supabase realtime
    if (this.currentSession) {
      supabase
        .from('video_call_signals')
        .insert({
          session_id: this.currentSession.id,
          message: message,
          timestamp: new Date().toISOString()
        });
    }
  }

  private startQualityMonitoring(): void {
    this.qualityMonitor = setInterval(async () => {
      if (this.peerConnection) {
        const stats = await this.peerConnection.getStats();
        const quality = this.analyzeCallQuality(stats);
        this.onQualityUpdate?.(quality);
      }
    }, 5000);
  }

  private stopQualityMonitoring(): void {
    if (this.qualityMonitor) {
      clearInterval(this.qualityMonitor);
      this.qualityMonitor = null;
    }
  }

  private analyzeCallQuality(stats: RTCStatsReport): CallQuality {
    let videoStats: any = {};
    let audioStats: any = {};
    let networkStats: any = {};

    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        videoStats = report;
      } else if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        audioStats = report;
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        networkStats = report;
      }
    });

    return {
      video: {
        resolution: `${videoStats.frameWidth || 0}x${videoStats.frameHeight || 0}`,
        frameRate: videoStats.framesPerSecond || 0,
        bitrate: videoStats.bytesReceived || 0
      },
      audio: {
        bitrate: audioStats.bytesReceived || 0,
        sampleRate: audioStats.clockRate || 0
      },
      network: {
        rtt: networkStats.currentRoundTripTime || 0,
        packetLoss: (networkStats.packetsLost || 0) / (networkStats.packetsReceived || 1),
        bandwidth: networkStats.availableOutgoingBitrate || 0
      }
    };
  }

  private async storeSession(session: VideoCallSession): Promise<void> {
    try {
      const { error } = await supabase
        .from('video_call_sessions')
        .insert({
          id: session.id,
          room_id: session.roomId,
          status: session.status,
          recording_enabled: session.recordingEnabled,
          screen_sharing_active: session.screenSharingActive,
          chat_enabled: session.chatEnabled,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to store session', 'WEBRTC', error);
    }
  }

  private async updateSessionStatus(status: VideoCallSession['status']): Promise<void> {
    if (this.currentSession) {
      this.currentSession.status = status;
      
      if (status === 'active' && !this.currentSession.startTime) {
        this.currentSession.startTime = new Date();
      } else if (status === 'ended' && !this.currentSession.endTime) {
        this.currentSession.endTime = new Date();
        if (this.currentSession.startTime) {
          this.currentSession.duration = 
            this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
        }
      }

      // Update in database
      try {
        const { error } = await supabase
          .from('video_call_sessions')
          .update({
            status: status,
            start_time: this.currentSession.startTime?.toISOString(),
            end_time: this.currentSession.endTime?.toISOString(),
            duration: this.currentSession.duration
          })
          .eq('id', this.currentSession.id);

        if (error) throw error;
      } catch (error) {
        logger.error('Failed to update session status', 'WEBRTC', error);
      }
    }
  }

  async endCall(): Promise<void> {
    try {
      // Stop all tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Close data channel
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      // Stop quality monitoring
      this.stopQualityMonitoring();

      // Update session status
      await this.updateSessionStatus('ended');

      logger.info('Video call ended', 'WEBRTC');
    } catch (error) {
      errorHandler.handleError(error, 'endCall');
    }
  }

  getMediaDevices(): MediaDevices {
    return this.mediaDevices;
  }

  getCurrentSession(): VideoCallSession | null {
    return this.currentSession;
  }

  // Event handlers (to be set by components)
  onRemoteStreamReceived?: (stream: MediaStream) => void;
  onChatMessage?: (message: any) => void;
  onScreenShareStart?: (participantId: string) => void;
  onScreenShareStop?: (participantId: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onQualityUpdate?: (quality: CallQuality) => void;
}

export const webrtcService = new WebRTCService();
