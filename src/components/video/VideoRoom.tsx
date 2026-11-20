import { useState, useEffect, useCallback, useRef } from "react";
import DailyIframe from '@daily-co/daily-js';
import { VideoControls } from "./VideoControls";
import { VideoRoomProps } from "@/types/video";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useIsTVDevice } from "@/hooks/use-tv-detection";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Clock, Users, Link2, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { formatCallDuration } from "@/lib/voiceCallState";

export function VideoRoom({ roomUrl, roomId, userName, videoQuality = "high", meetingToken, onLeave, consultationId, isProvider = false, onEndMeeting }: VideoRoomProps) {
  const [callFrame, setCallFrame] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [startAudioOnly, setStartAudioOnly] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [endArmed, setEndArmed] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const joinedAtRef = useRef<number | null>(null);
  
  // Use roomId if passed, otherwise use roomUrl
  const actualRoomUrl = roomId || roomUrl;
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTV = useIsTVDevice();
  
  const handleJoinedMeeting = useCallback(() => {
    setHasJoined(true);
    if (joinedAtRef.current === null) {
      joinedAtRef.current = Date.now();
    }
    toast.success("You've joined your visit");
    // If the user chose "audio-only instead" from the error screen, apply it now.
    if (startAudioOnly) {
      setStartAudioOnly(false);
      setTimeout(() => {
        try {
          callFrame?.setLocalVideo(false);
          setIsVideoOff(true);
          callFrame?.updateReceiveSettings({ '*': { video: 'off' } });
          setIsAudioOnly(true);
        } catch { /* best effort */ }
      }, 500);
    }
  }, [startAudioOnly, callFrame]);
  
  const handleError = useCallback((e: any) => {
    // Never surface Daily's raw error text to patients (standing
    // error-presentation rule) — plain language in the app's own UI.
    console.error("Daily.co error:", e);
    setError("The video call hit a problem.");
    toast.error("The video call hit a problem. You can try rejoining.");
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
    // Create Daily callFrame
    if (!callFrame && actualRoomUrl) {
      const options: any = {
        url: actualRoomUrl,
        userName: userName,
        showLeaveButton: true,
        showFullscreenButton: true,
        // Pass meeting token for private rooms (required by Daily.co)
        ...(meetingToken ? { token: meetingToken } : {}),
        iframeStyle: {
          // Bounded to the video container — the old style was a
          // position:fixed full-viewport iframe (zIndex 20) that painted
          // OVER the app's own control bar, leaving our Leave/End and
          // call controls unreachable underneath it.
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          border: 'none'
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
        daily.on("participant-updated", handleParticipantsChange);
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
        // join() rejects if the room can't be entered — without this catch
        // the "Joining meeting…" loader would spin forever on failure.
        daily.join().catch((joinErr: any) => {
          console.error("Daily join failed:", joinErr);
          setError("Could not join the video room. Check your connection and try again.");
        });
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
  }, [actualRoomUrl, userName, handleJoinedMeeting, handleError, 
      handleParticipantsChange, handleNetworkQualityChange, 
      handleNetworkConnection, reconnecting, joinAttempt]);

  
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

  const handleToggleAudioOnly = useCallback(() => {
    if (!callFrame) return;
    const next = !isAudioOnly;
    setIsAudioOnly(next);
    try {
      if (next) {
        // Drop local camera and stop receiving remote video — keeps audio only.
        callFrame.setLocalVideo(false);
        setIsVideoOff(true);
        callFrame.updateReceiveSettings({ '*': { video: 'off' } });
        toast.success("Audio-only mode on. Your visit continues by voice.");
      } else {
        callFrame.setLocalVideo(true);
        setIsVideoOff(false);
        callFrame.updateReceiveSettings({ '*': { video: 'on' } });
        toast.success("Video turned back on.");
      }
    } catch (e) {
      console.error("Error toggling audio-only mode:", e);
      toast.error("Could not switch modes. Try again.");
      setIsAudioOnly(!next);
    }
  }, [callFrame, isAudioOnly]);

  const handleRejoin = useCallback(() => {
    // Destroy the broken frame and force a fresh join via joinAttempt bump.
    if (callFrame) {
      try { callFrame.destroy(); } catch { /* ignore */ }
      setCallFrame(null);
    }
    setError(null);
    setHasJoined(false);
    setReconnecting(false);
    setJoinAttempt(prev => prev + 1);
  }, [callFrame]);

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

  // Call-duration timer, ticking from the moment we actually joined.
  useEffect(() => {
    if (!hasJoined) return;
    const t = setInterval(() => {
      if (joinedAtRef.current !== null) {
        setElapsedSeconds((Date.now() - joinedAtRef.current) / 1000);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [hasJoined]);

  const handleCopyJoinLink = useCallback(async () => {
    if (!consultationId) return;
    const link = `${window.location.origin}/video-consultations?join=${consultationId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Join link copied — share it with the other participant.");
    } catch {
      toast.error("Could not copy the link. Please copy it from the address bar instead.");
    }
  }, [consultationId]);

  // End-for-everyone is destructive, so it arms on first click and
  // only fires on the confirming second click.
  const handleEndMeetingClick = useCallback(async () => {
    if (!onEndMeeting) return;
    if (!endArmed) {
      setEndArmed(true);
      setTimeout(() => setEndArmed(false), 4000);
      return;
    }
    setIsEnding(true);
    try {
      await onEndMeeting();
    } finally {
      setIsEnding(false);
      setEndArmed(false);
    }
  }, [onEndMeeting, endArmed]);

  return (
    <div className="relative flex h-full w-full flex-col">
      {hasJoined && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4" />
            {formatCallDuration(elapsedSeconds)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[36px]"
            onClick={() => setShowParticipants((v) => !v)}
            aria-expanded={showParticipants}
          >
            <Users className="mr-1.5 h-4 w-4" />
            {participants.length} in call
          </Button>
          {consultationId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[36px]"
              onClick={handleCopyJoinLink}
            >
              <Link2 className="mr-1.5 h-4 w-4" />
              Copy join link
            </Button>
          )}
          {isRecording && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Recording
            </span>
          )}
        </div>
      )}

      {hasJoined && showParticipants && (
        <div className="mb-3 rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-sm font-medium text-foreground">Participants</p>
          <ul className="space-y-1.5">
            {participants.map((p: any) => (
              <li key={p.session_id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(p.user_name || "G").slice(0, 1).toUpperCase()}
                </span>
                <span className="text-foreground">{p.user_name || "Guest"}</span>
                {p.local && <span className="text-xs">(You)</span>}
                {p.owner && <span className="text-xs">· Host</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Your connection dropped</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            This happens sometimes — usually a weak signal. Your visit is still
            booked and the doctor is waiting. Try rejoining.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={handleRejoin} className="min-h-[44px]">
              Rejoin visit
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => { setStartAudioOnly(true); handleRejoin(); }}
            >
              Try audio-only instead
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            If it keeps failing, check your data connection or move closer to your Wi-Fi router.
          </p>
        </div>
      )}
      
      <div id="video-container" className="relative h-[58vh] min-h-[360px] w-full shrink-0 overflow-hidden rounded-lg bg-black/5 md:h-[64vh]">
        {(!callFrame || !hasJoined || reconnecting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
            <div className="text-center p-4 bg-background/80 backdrop-blur-sm rounded-lg shadow-lg">
              <div className="animate-bounce mb-4">
                <div className="w-4 h-4 bg-primary mx-auto rounded-full"></div>
              </div>
              <p className="font-medium">
                {reconnecting ? "Reconnecting…" : "Joining your visit…"}
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <VideoControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          isAudioOnly={isAudioOnly}
          currentQuality={videoQuality}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleRecording={handleToggleRecording}
          onToggleAudioOnly={handleToggleAudioOnly}
          onQualityChange={handleQualityChange}
        />

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={handleLeaveMeeting}
            size={isMobile ? "lg" : "default"}
            className={isTV ? "px-6 py-4 text-lg" : ""}
            data-dpad-focusable={isTV ? "true" : undefined}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Leave Visit
          </Button>
          {isProvider && onEndMeeting && (
            <Button
              variant="destructive"
              onClick={handleEndMeetingClick}
              disabled={isEnding}
              size={isMobile ? "lg" : "default"}
              className={isTV ? "px-6 py-4 text-lg" : ""}
              data-dpad-focusable={isTV ? "true" : undefined}
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              {isEnding ? "Ending…" : endArmed ? "Click again to end for everyone" : "End Meeting"}
            </Button>
          )}
        </div>
        {isProvider && onEndMeeting && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Ending the meeting closes the visit for everyone and marks the consultation completed.
          </p>
        )}
      </div>
    </div>
  );
}
