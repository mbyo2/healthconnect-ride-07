import { useState, useEffect, useCallback, useRef } from "react";
import DailyIframe from '@daily-co/daily-js';
import { VideoControls } from "./VideoControls";
import { VideoRoomProps } from "@/types/video";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useIsTVDevice } from "@/hooks/use-tv-detection";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, AlertCircle, Clock, Users, Link2, PhoneOff,
  SignalHigh, SignalMedium, SignalLow, Signal,
  MessageSquare, Info, Send, X, LayoutGrid, GalleryVertical,
} from "lucide-react";
import { toast } from "sonner";
import { formatCallDuration } from "@/lib/voiceCallState";
import {
  CAPTURE_PROFILES,
  QualityMode,
  CaptureProfile,
  NetState,
  NET_STATE_LABEL,
  netStateFromEvent,
  stepDownProfile,
  stepUpProfile,
} from "@/lib/videoQuality";

interface ChatMessage {
  id: string;
  name: string;
  text: string;
  mine: boolean;
  ts: number;
}

// In-call chat rides Daily app-messages (signalling transport) — nothing
// is stored anywhere; messages exist only in the two participants'
// browsers for the length of the call.
const CHAT_KIND = "dococlock-chat";
const MAX_CHAT_LENGTH = 1000;
const MAX_CHAT_KEPT = 200;

export function VideoRoom({ roomUrl, roomId, userName, videoQuality = "high", meetingToken, onLeave, consultationId, isProvider = false, onEndMeeting, peerName }: VideoRoomProps) {
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
  const [showInfo, setShowInfo] = useState(false);
  const [endArmed, setEndArmed] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const joinedAtRef = useRef<number | null>(null);

  // --- Quality + network (Zoom-parity pass) ---
  const initialMode: QualityMode = videoQuality === "low" ? "low" : "auto";
  const initialProfile: CaptureProfile = videoQuality === "low" ? "low" : "high";
  const [qualityMode, setQualityMode] = useState<QualityMode>(initialMode);
  const [appliedProfile, setAppliedProfile] = useState<CaptureProfile>(initialProfile);
  const [netState, setNetState] = useState<NetState>("unknown");
  const [degradedByAuto, setDegradedByAuto] = useState(false);
  const [netStats, setNetStats] = useState<{ rttMs: number | null; sendKbps: number | null; recvKbps: number | null } | null>(null);
  const qualityModeRef = useRef<QualityMode>(initialMode);
  const appliedProfileRef = useRef<CaptureProfile>(initialProfile);
  const degradedRef = useRef(false);
  const lastAdaptRef = useRef(0);
  const joinedRef = useRef(false);

  // --- Layout ---
  const [layoutMode, setLayoutMode] = useState<"speaker" | "gallery">("speaker");
  const layoutModeRef = useRef<"speaker" | "gallery">("speaker");

  // --- Background blur ---
  const [isBlurred, setIsBlurred] = useState(false);
  const blurredRef = useRef(false);

  // --- Chat ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatDraft, setChatDraft] = useState("");
  const chatOpenRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // --- Waiting room (patient waits for the provider's presence) ---
  const [providerPresent, setProviderPresent] = useState(false);
  const [joinAnyway, setJoinAnyway] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const providerPresentRef = useRef(false);
  const presenceStateRef = useRef<Record<string, any[]>>({});
  const patientWaitingToastRef = useRef(false);
  const mountIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  );

  const frameRef = useRef<any>(null);

  // Use roomId if passed, otherwise use roomUrl
  const actualRoomUrl = roomId || roomUrl;

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTV = useIsTVDevice();

  const waitingForProvider =
    !!consultationId && !isProvider && !providerPresent && !joinAnyway;
  const canEnterRoom = !waitingForProvider;

  // ------------------------------------------------------------------
  // Waiting room: Supabase presence on a per-consultation channel.
  // Daily's own knock-to-join only gates tokenless guests; every
  // participant here carries a token, so the "waiting room" is this:
  // the patient sees a calm waiting state and their call frame is only
  // created once the provider is actually present. The provider, in
  // turn, is told the patient is waiting.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!consultationId) return;
    const key = `${isProvider ? "provider" : "patient"}-${mountIdRef.current}`;
    const channel = supabase.channel(`visit-presence-${consultationId}`, {
      config: { presence: { key } },
    });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, any[]>;
      presenceStateRef.current = state;
      const flat = Object.values(state).flat();
      if (flat.some((p: any) => p?.role === "provider")) {
        providerPresentRef.current = true;
        setProviderPresent(true);
      }
      if (
        isProvider &&
        flat.some((p: any) => p?.role === "patient") &&
        !patientWaitingToastRef.current
      ) {
        patientWaitingToastRef.current = true;
        toast.info("Your patient is waiting — they'll join you now.");
      }
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          role: isProvider ? "provider" : "patient",
          name: userName,
        });
        if (isProvider) {
          providerPresentRef.current = true;
          setProviderPresent(true);
        }
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId, isProvider, userName]);

  // Waiting timer (drives the "waiting 0:42" label + the join-anyway
  // safety valve after 45 seconds).
  useEffect(() => {
    if (!waitingForProvider) return;
    setWaitSeconds(0);
    const t = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [waitingForProvider]);

  const applyCaptureProfile = useCallback((profile: CaptureProfile) => {
    appliedProfileRef.current = profile;
    setAppliedProfile(profile);
    try {
      frameRef.current
        ?.updateInputSettings({ video: { settings: CAPTURE_PROFILES[profile] } })
        ?.catch?.(() => { /* best effort — Daily adapts layers regardless */ });
    } catch { /* best effort */ }
  }, []);

  const handleJoinedMeeting = useCallback(() => {
    setHasJoined(true);
    joinedRef.current = true;
    if (joinedAtRef.current === null) {
      joinedAtRef.current = Date.now();
    }
    toast.success("You've joined your visit");
    // Zoom-grade audio: turn on Daily's noise cancellation for the
    // microphone. Non-fatal if this domain/device can't run it — the
    // browser's own echo/noise processing (requested at join) remains.
    try {
      frameRef.current
        ?.updateInputSettings({ audio: { processor: { type: "noise-cancellation" } } })
        ?.catch?.(() => { /* processor unavailable — continue without it */ });
    } catch { /* ignore */ }
    try {
      frameRef.current?.setActiveSpeakerMode(layoutModeRef.current === "speaker");
    } catch { /* layout is cosmetic */ }
    // If the user chose "audio-only instead" from the error screen, apply it now.
    if (startAudioOnly) {
      setStartAudioOnly(false);
      setTimeout(() => {
        try {
          frameRef.current?.setLocalVideo(false);
          setIsVideoOff(true);
          frameRef.current?.updateReceiveSettings({ '*': { video: 'off' } });
          setIsAudioOnly(true);
        } catch { /* best effort */ }
      }, 500);
    }
  }, [startAudioOnly]);

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

  // Connection quality: a persistent indicator (not just a toast), and
  // in Auto mode the capture profile follows the network — down when
  // it degrades (picture softens, call survives), back up when it
  // recovers. Manual quality picks are never overridden.
  const handleNetworkQualityChange = useCallback((e: any) => {
    const state = netStateFromEvent(e);
    if (state === "unknown") return;
    setNetState(state);
    if (!joinedRef.current) return;
    if (qualityModeRef.current !== "auto") return;
    const now = Date.now();
    if (state === "bad" && now - lastAdaptRef.current > 8000) {
      const next = stepDownProfile(appliedProfileRef.current);
      if (next !== appliedProfileRef.current) {
        lastAdaptRef.current = now;
        degradedRef.current = true;
        setDegradedByAuto(true);
        applyCaptureProfile(next);
      }
    } else if (state === "good" && degradedRef.current && now - lastAdaptRef.current > 15000) {
      const next = stepUpProfile(appliedProfileRef.current);
      lastAdaptRef.current = now;
      applyCaptureProfile(next);
      if (next === "high") {
        degradedRef.current = false;
        setDegradedByAuto(false);
        toast.success("Your connection improved — video quality is back to full.", { id: "net-recovered" });
      }
    }
  }, [applyCaptureProfile]);

  const handleNetworkConnection = useCallback((e: any) => {
    if (e.type === "disconnected") {
      setReconnecting(true);
      toast.error("Connection lost. Attempting to reconnect...", { id: "reconnect-toast" });
    } else if (e.type === "connected") {
      setReconnecting((prev) => {
        if (prev) toast.success("Reconnected successfully!", { id: "reconnect-toast" });
        return false;
      });
    }
  }, []);

  const handleAppMessage = useCallback((e: any) => {
    const data = e?.data;
    if (!data || data.kind !== CHAT_KIND) return;
    const text = typeof data.text === "string" ? data.text.slice(0, MAX_CHAT_LENGTH).trim() : "";
    if (!text) return;
    const msg: ChatMessage = {
      id: `${e.fromId ?? "peer"}-${typeof data.ts === "number" ? data.ts : Date.now()}`,
      name: typeof data.name === "string" && data.name ? data.name : "Guest",
      text,
      mine: false,
      ts: typeof data.ts === "number" ? data.ts : Date.now(),
    };
    setChatMessages((prev) => [...prev.slice(-(MAX_CHAT_KEPT - 1)), msg]);
    if (!chatOpenRef.current) {
      setChatUnread((u) => u + 1);
    }
  }, []);

  const handleNonfatalError = useCallback((e: any) => {
    if (e?.type === "video-processor-error" && blurredRef.current) {
      blurredRef.current = false;
      setIsBlurred(false);
      toast.warning("Background blur isn't supported on this device, so it's been turned off.");
    }
  }, []);

  useEffect(() => {
    // Create the Daily frame once we're allowed into the room (the
    // waiting room gates the patient until the provider is present).
    if (!canEnterRoom || !actualRoomUrl) return;
    if (frameRef.current) return;

    const options: any = {
      url: actualRoomUrl,
      userName: userName,
      showLeaveButton: true,
      showFullscreenButton: true,
      // Speaker view by default (Zoom's 1-to-1 feel); the in-call bar
      // can switch to gallery. No effect on Daily's mobile layout.
      activeSpeakerMode: true,
      // Pass meeting token for private rooms (required by Daily.co)
      ...(meetingToken ? { token: meetingToken } : {}),
      // Start at the HD capture profile with browser audio processing;
      // noise cancellation is layered on after join (see
      // handleJoinedMeeting). All constraints are `ideal`, so a weaker
      // camera/mic gives its best instead of failing the join.
      inputSettings: {
        video: { settings: CAPTURE_PROFILES[initialProfile] },
        audio: {
          settings: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        },
      },
      // Adaptive layers on (matches the room's adaptive simulcast):
      // quality follows the network in both directions. Screen share
      // is detail-optimised so shared text stays readable.
      sendSettings: {
        video: { allowAdaptiveLayers: true, maxQuality: "high" },
        screenVideo: "detail-optimized",
      },
      // The in-frame UI wears the app's colours.
      theme: {
        light: {
          colors: {
            accent: "#003087",
            accentText: "#FFFFFF",
            background: "#FFFFFF",
            backgroundAccent: "#EEF2F7",
            baseText: "#001435",
            border: "#D7DEE8",
            mainAreaBg: "#0B1526",
            mainAreaBgAccent: "#12233D",
            mainAreaText: "#FFFFFF",
            supportiveText: "#5A6B84",
          },
        },
        dark: {
          colors: {
            accent: "#FFC439",
            accentText: "#001435",
            background: "#0B1526",
            backgroundAccent: "#12233D",
            baseText: "#F5F7FA",
            border: "#22344F",
            mainAreaBg: "#000000",
            mainAreaBgAccent: "#101826",
            mainAreaText: "#FFFFFF",
            supportiveText: "#9DB2CC",
          },
        },
      },
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

    let daily: any;
    try {
      daily = DailyIframe.createFrame(
        document.getElementById("video-container") || undefined,
        options
      );
    } catch (err) {
      console.error("Error creating Daily.co frame:", err);
      setError("Failed to create video call. Please try again.");
      return;
    }

    frameRef.current = daily;
    setCallFrame(daily);

    daily.on("joined-meeting", handleJoinedMeeting);
    daily.on("error", handleError);
    daily.on("participant-joined", handleParticipantsChange);
    daily.on("participant-updated", handleParticipantsChange);
    daily.on("participant-left", handleParticipantsChange);
    daily.on("network-quality-change", handleNetworkQualityChange);
    daily.on("network-connection", handleNetworkConnection);
    daily.on("app-message", handleAppMessage);
    daily.on("nonfatal-error", handleNonfatalError);

    daily.on("recording-started", () => {
      setIsRecording(true);
      toast.info("Recording started");
    });

    daily.on("recording-stopped", () => {
      setIsRecording(false);
      toast.info("Recording stopped");
    });

    // join() rejects if the room can't be entered — without this catch
    // the "Joining meeting…" loader would spin forever on failure.
    daily.join().catch((joinErr: any) => {
      console.error("Daily join failed:", joinErr);
      setError("Could not join the video room. Check your connection and try again.");
    });
    // joinAttempt is the rejoin trigger: handleRejoin clears frameRef
    // and bumps it, which re-runs this effect to build a fresh frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEnterRoom, actualRoomUrl, joinAttempt]);

  // Destroy the frame only when the room component truly goes away.
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        try { frameRef.current.destroy(); } catch { /* ignore */ }
        frameRef.current = null;
      }
    };
  }, []);

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
    if (frameRef.current) {
      try { frameRef.current.destroy(); } catch { /* ignore */ }
      frameRef.current = null;
    }
    setCallFrame(null);
    setError(null);
    setHasJoined(false);
    joinedRef.current = false;
    setReconnecting(false);
    // Re-check presence from the latest sync: if the provider is still
    // around, re-enter immediately instead of waiting again.
    const flat = Object.values(presenceStateRef.current).flat();
    if (flat.some((p: any) => p?.role === "provider")) {
      providerPresentRef.current = true;
      setProviderPresent(true);
    } else if (!isProvider) {
      providerPresentRef.current = false;
      setProviderPresent(false);
    }
    setJoinAttempt(prev => prev + 1);
  }, [isProvider]);

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

  const handleQualityChange = (mode: QualityMode) => {
    qualityModeRef.current = mode;
    setQualityMode(mode);
    if (mode === "auto") {
      degradedRef.current = false;
      setDegradedByAuto(false);
      applyCaptureProfile("high");
      toast.success("Quality set to Auto — it will follow your connection.");
    } else {
      applyCaptureProfile(mode);
      toast.success(`Quality changed to ${mode}`);
    }
  };

  const handleLayoutChange = (mode: "speaker" | "gallery") => {
    layoutModeRef.current = mode;
    setLayoutMode(mode);
    try {
      frameRef.current?.setActiveSpeakerMode(mode === "speaker");
    } catch { /* layout is cosmetic */ }
  };

  const handleToggleBlur = async () => {
    if (!callFrame) return;
    const next = !isBlurred;
    try {
      await callFrame.updateInputSettings({
        video: {
          processor: next
            ? { type: "background-blur", config: { strength: 0.7 } }
            : { type: "none" },
        },
      });
      blurredRef.current = next;
      setIsBlurred(next);
      toast.success(next ? "Background blur on" : "Background blur off");
    } catch (e) {
      console.error("Error toggling background blur:", e);
      toast.error("Background blur isn't available on this device.");
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

  // Live network stats while the info panel is open (Zoom's
  // "statistics" view, in plain units).
  useEffect(() => {
    if (!showInfo || !callFrame) return;
    let live = true;
    const pull = async () => {
      try {
        const s = await callFrame.getNetworkStats();
        const latest = s?.stats?.latest;
        if (!live || !latest) return;
        setNetStats({
          rttMs: latest.networkRoundTripTime != null ? Math.round(latest.networkRoundTripTime * 1000) : null,
          sendKbps: latest.sendBitsPerSecond != null ? Math.round(latest.sendBitsPerSecond / 1000) : null,
          recvKbps: latest.recvBitsPerSecond != null ? Math.round(latest.recvBitsPerSecond / 1000) : null,
        });
        if (s?.networkState) setNetState(s.networkState as NetState);
      } catch { /* stats are informational only */ }
    };
    pull();
    const t = setInterval(pull, 5000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [showInfo, callFrame]);

  // Keep the chat scrolled to the newest message while it's open.
  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatOpen]);

  const handleToggleChat = () => {
    const next = !chatOpen;
    chatOpenRef.current = next;
    setChatOpen(next);
    if (next) setChatUnread(0);
  };

  const handleSendChat = () => {
    const text = chatDraft.trim().slice(0, MAX_CHAT_LENGTH);
    if (!text || !callFrame) return;
    const payload = { kind: CHAT_KIND, text, name: userName, ts: Date.now() };
    try {
      callFrame.sendAppMessage(payload, '*');
    } catch (e) {
      console.error("Error sending chat message:", e);
      toast.error("Couldn't send that message. Please try again.");
      return;
    }
    setChatMessages((prev) => [
      ...prev.slice(-(MAX_CHAT_KEPT - 1)),
      { id: `me-${payload.ts}`, name: userName, text, mine: true, ts: payload.ts },
    ]);
    setChatDraft("");
  };

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

  const netChip =
    netState === "good" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <SignalHigh className="h-4 w-4" /> Good
      </span>
    ) : netState === "warning" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
        <SignalMedium className="h-4 w-4" /> Fair
      </span>
    ) : netState === "bad" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400">
        <SignalLow className="h-4 w-4" /> Weak
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
        <Signal className="h-4 w-4" /> Checking…
      </span>
    );

  return (
    <div className="relative flex h-full w-full flex-col">
      {hasJoined && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4" />
            {formatCallDuration(elapsedSeconds)}
          </span>
          {netChip}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[36px]"
            onClick={() => { setShowParticipants((v) => !v); setShowInfo(false); }}
            aria-expanded={showParticipants}
          >
            <Users className="mr-1.5 h-4 w-4" />
            {participants.length} in call
          </Button>
          {!isMobile && (
            <div className="inline-flex overflow-hidden rounded-md border border-input" role="group" aria-label="Call layout">
              <Button
                type="button"
                variant={layoutMode === "speaker" ? "default" : "ghost"}
                size="sm"
                className="min-h-[36px] rounded-none"
                onClick={() => handleLayoutChange("speaker")}
                aria-pressed={layoutMode === "speaker"}
                title="Speaker view — the person talking fills the screen"
              >
                <GalleryVertical className="mr-1.5 h-4 w-4" />
                Speaker
              </Button>
              <Button
                type="button"
                variant={layoutMode === "gallery" ? "default" : "ghost"}
                size="sm"
                className="min-h-[36px] rounded-none"
                onClick={() => handleLayoutChange("gallery")}
                aria-pressed={layoutMode === "gallery"}
                title="Gallery view — everyone in a grid"
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Gallery
              </Button>
            </div>
          )}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[36px]"
            onClick={handleToggleChat}
            aria-expanded={chatOpen}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Chat
            {chatUnread > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFC439] px-1 text-xs font-bold text-[#001435]">
                {chatUnread}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[36px]"
            onClick={() => { setShowInfo((v) => !v); setShowParticipants(false); }}
            aria-expanded={showInfo}
          >
            <Info className="mr-1.5 h-4 w-4" />
            Visit info
          </Button>
          {isRecording && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Recording
            </span>
          )}
        </div>
      )}

      {hasJoined && (netState === "bad" || (qualityMode === "auto" && degradedByAuto)) && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Your connection is weak —{" "}
          {qualityMode === "auto" && degradedByAuto
            ? "we've lowered video quality to keep your call smooth. It will go back up on its own when your connection improves."
            : "video quality may drop to keep your call smooth. Moving closer to your router can help."}
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

      {hasJoined && showInfo && (
        <div className="mb-3 rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-sm font-medium text-foreground">Visit info</p>
          <dl className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt>Visit with</dt>
              <dd className="text-foreground">{peerName || (isProvider ? "Your patient" : "Your doctor")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Duration</dt>
              <dd className="text-foreground">{formatCallDuration(elapsedSeconds)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Connection</dt>
              <dd className="text-foreground">{NET_STATE_LABEL[netState]}</dd>
            </div>
            {netStats && (
              <div className="flex justify-between gap-4">
                <dt>Speed</dt>
                <dd className="text-foreground">
                  {netStats.recvKbps != null ? `↓ ${(netStats.recvKbps / 1000).toFixed(1)} Mbps` : "↓ —"}
                  {" · "}
                  {netStats.sendKbps != null ? `↑ ${(netStats.sendKbps / 1000).toFixed(1)} Mbps` : "↑ —"}
                  {netStats.rttMs != null ? ` · ${netStats.rttMs} ms` : ""}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt>In call</dt>
              <dd className="text-foreground">{participants.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Recording</dt>
              <dd className="text-foreground">{isRecording ? "On" : "Off"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Video quality</dt>
              <dd className="text-foreground capitalize">
                {qualityMode === "auto" ? `Auto (${appliedProfile})` : qualityMode}
              </dd>
            </div>
          </dl>
          {consultationId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-[36px]"
              onClick={handleCopyJoinLink}
            >
              <Link2 className="mr-1.5 h-4 w-4" />
              Copy join link
            </Button>
          )}
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

      {waitingForProvider ? (
        <div className="flex h-[58vh] min-h-[360px] w-full items-center justify-center rounded-lg border border-border bg-card md:h-[64vh]">
          <div className="max-w-sm p-6 text-center">
            <div className="mb-4 flex justify-center">
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#003087] opacity-60" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-[#003087]" />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Waiting for {peerName || "your doctor"} to start the visit
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep this page open — you'll join automatically as soon as they arrive.
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              Waiting {formatCallDuration(waitSeconds)}
            </p>
            {waitSeconds >= 45 && (
              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-[44px]"
                onClick={() => setJoinAnyway(true)}
              >
                Join the room directly
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row">
          <div id="video-container" className="relative h-[58vh] min-h-[360px] w-full min-w-0 flex-1 overflow-hidden rounded-lg bg-black/5 md:h-[64vh]">
            {(!callFrame || !hasJoined || reconnecting) && (
              // pointer-events-none is LOAD-BEARING: this status pill
              // sits over the Daily iframe, and Daily's pre-join lobby
              // has its own Join button that must stay clickable. A
              // plain overlay here swallows every click and strands
              // users in the lobby (proven live 2026-11-20).
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 z-10">
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

          {chatOpen && (
            <div className="flex max-h-[70vh] w-full shrink-0 flex-col rounded-xl border border-border bg-card lg:max-h-none lg:w-80">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <MessageSquare className="h-4 w-4" /> Chat
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleChat}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="px-3 pt-2 text-xs text-muted-foreground">
                Messages are only visible during this call and aren't saved.
              </p>
              <div ref={chatScrollRef} className="min-h-[120px] flex-1 space-y-2 overflow-y-auto px-3 py-2">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Say hello to {peerName || (isProvider ? "your patient" : "your doctor")}.
                  </p>
                )}
                {chatMessages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
                    <span className="mb-0.5 text-xs text-muted-foreground">
                      {m.mine ? "You" : m.name}
                    </span>
                    <span
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        m.mine
                          ? "bg-[#003087] text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
              </div>
              <form
                className="flex gap-2 border-t border-border p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
              >
                <input
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder="Type a message…"
                  maxLength={MAX_CHAT_LENGTH}
                  disabled={!hasJoined}
                  className="min-h-[44px] flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#003087]"
                  aria-label="Chat message"
                />
                <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!hasJoined || !chatDraft.trim()} aria-label="Send message">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <VideoControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          isAudioOnly={isAudioOnly}
          isBlurred={isBlurred}
          currentQuality={qualityMode}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleRecording={handleToggleRecording}
          onToggleAudioOnly={handleToggleAudioOnly}
          onToggleBlur={handleToggleBlur}
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
