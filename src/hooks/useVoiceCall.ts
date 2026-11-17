import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import {
  acquireChannel,
  releaseChannel,
  voiceCallRingTopic,
  voiceCallTopic,
} from "@/lib/realtimeChannel";
import { getIceServers } from "@/lib/iceServers";
import {
  RING_TIMEOUT_MS,
  callSummaryText,
  initialVoiceCallState,
  voiceCallReducer,
  type VoiceCallEndReason,
} from "@/lib/voiceCallState";

type SignalPayload =
  | { kind: "ring"; callId: string; callerId: string }
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit }
  | { kind: "accepted"; callId: string }
  | { kind: "declined"; callId: string }
  | { kind: "missed"; callId: string }
  | { kind: "cancelled"; callId: string }
  | { kind: "hangup"; callId: string };

interface UseVoiceCallArgs {
  /** The other participant of the open chat thread. */
  peerId: string;
  peerName?: string;
}

/**
 * Free in-app voice calling over WebRTC, signalled over Supabase Realtime.
 *
 * - Voice only: getUserMedia({ audio: true, video: false }), one audio
 *   track each way, DTLS-SRTP encrypted by WebRTC itself.
 * - No paid service, no WhatsApp: signalling is Realtime broadcast on a
 *   per-call channel; media is peer-to-peer (STUN only by default — see
 *   `src/lib/iceServers.ts` for the TURN verdict and the env override).
 * - Authorisation: the `voice_calls` row is the anchor. A ring is only
 *   shown after the callee reads that row (RLS: participants only), so a
 *   third user who guesses a channel name cannot ring, inject SDP, or
 *   eavesdrop — they cannot read the row and the call UUID is unguessable.
 * - Call state is written back to `voice_calls` and a one-line summary is
 *   posted into the chat thread (as a plain message row) so the thread
 *   shows ringing / accepted / ended / declined / missed.
 */
export function useVoiceCall({ peerId, peerName }: UseVoiceCallArgs) {
  const [state, dispatch] = useReducer(voiceCallReducer, initialVoiceCallState);
  const [muted, setMuted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [iceState, setIceState] = useState<string>("new");
  const [error, setError] = useState<string | null>(null);

  const myIdRef = useRef<string | null>(null);
  const roleRef = useRef<"caller" | "callee" | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callChannelRef = useRef<{ topic: string; channel: RealtimeChannel } | null>(null);
  const callChannelReadyRef = useRef<Promise<void> | null>(null);
  const callChannelReadyResolveRef = useRef<(() => void) | null>(null);
  const ringChannelRef = useRef<{ topic: string; channel: RealtimeChannel } | null>(null);
  const answeredAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
  }, []);

  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* already closed */
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setIceState("new");
  }, []);

  const detachCallChannel = useCallback(() => {
    if (callChannelRef.current) {
      releaseChannel(callChannelRef.current.topic);
      callChannelRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    stopTimer();
    clearRingTimeout();
    closePeerConnection();
    detachCallChannel();
  }, [stopTimer, clearRingTimeout, closePeerConnection, detachCallChannel]);

  const startDurationTimer = useCallback(() => {
    answeredAtRef.current = Date.now();
    setDurationSeconds(0);
    stopTimer();
    timerRef.current = setInterval(() => {
      if (answeredAtRef.current) {
        setDurationSeconds(Math.floor((Date.now() - answeredAtRef.current) / 1000));
      }
    }, 1000);
  }, [stopTimer]);

  const updateCallRow = useCallback(async (callId: string, patch: Record<string, unknown>) => {
    const { error: err } = await supabase.from("voice_calls").update(patch).eq("id", callId);
    if (err) console.error("voice_calls update failed:", err);
  }, []);

  const postThreadSummary = useCallback(
    async (reason: VoiceCallEndReason, seconds: number) => {
      // Only the caller posts the summary, so the thread gets exactly one.
      if (roleRef.current !== "caller" || !myIdRef.current) return;
      const { error: err } = await supabase.from("messages").insert({
        content: callSummaryText(reason, seconds),
        sender_id: myIdRef.current,
        receiver_id: peerId,
      });
      if (err) console.error("call summary message failed:", err);
    },
    [peerId],
  );

  /** End the call locally + remotely. `reason` is recorded on the row. */
  const finishCall = useCallback(
    async (reason: VoiceCallEndReason, opts?: { notifyPeer?: boolean; postSummary?: boolean }) => {
      const { callId } = stateRef.current;
      const seconds = answeredAtRef.current
        ? Math.floor((Date.now() - answeredAtRef.current) / 1000)
        : 0;
      clearRingTimeout();
      if (callId) {
        const patch: Record<string, unknown> = { ended_at: new Date().toISOString() };
        if (reason === "ended" || reason === "failed") patch.duration_seconds = seconds;
        if (reason === "declined") patch.status = "declined";
        else if (reason === "missed") patch.status = "missed";
        else if (reason === "failed") patch.status = "failed";
        else patch.status = "ended";
        await updateCallRow(callId, patch);
        if (opts?.notifyPeer !== false && callChannelRef.current) {
          const event = reason === "declined" ? "declined" : reason === "missed" ? "missed" : "hangup";
          try {
            await callChannelReadyRef.current;
            await callChannelRef.current.channel.send({
              type: "broadcast",
              event,
              payload: { kind: event, callId } as SignalPayload,
            });
          } catch {
            /* peer already gone — row is the source of truth */
          }
        }
        // The callee is NOT subscribed to the call channel until they
        // accept, so a missed/cancelled ring must also go to their ring
        // mailbox, or their incoming UI would stay stuck.
        if ((reason === "missed" || reason === "cancelled") && myIdRef.current) {
          const ringTopic = voiceCallRingTopic(peerId);
          const ringChannel = acquireChannel(ringTopic);
          ringChannel.subscribe((status) => {
            if (status !== "SUBSCRIBED") return;
            void ringChannel
              .send({
                type: "broadcast",
                event: reason,
                payload: { kind: reason, callId } as SignalPayload,
              })
              .finally(() => setTimeout(() => releaseChannel(ringTopic), 1500));
          });
        }
        if (opts?.postSummary !== false) await postThreadSummary(reason, seconds);
      }
      teardown();
      dispatch({ type: "END", reason });
      if (endFlashRef.current) clearTimeout(endFlashRef.current);
      endFlashRef.current = setTimeout(() => dispatch({ type: "RESET" }), 4000);
    },
    [clearRingTimeout, teardown, updateCallRow, postThreadSummary],
  );

  const createPeerConnection = useCallback(
    (callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;
      // DEV-only proof handle: live QA scripts read pc.getStats() to prove
      // audio flows. Never set in production builds.
      if (import.meta.env.DEV) {
        (window as unknown as { __voiceCallPc?: RTCPeerConnection }).__voiceCallPc = pc;
      }
      pc.onicecandidate = (e) => {
        if (e.candidate && callChannelRef.current) {
          void callChannelRef.current.channel.send({
            type: "broadcast",
            event: "ice",
            payload: { kind: "ice", candidate: e.candidate.toJSON() } as SignalPayload,
          });
        }
      };
      pc.ontrack = (e) => {
        if (remoteAudioRef.current && e.streams[0]) {
          remoteAudioRef.current.srcObject = e.streams[0];
          void remoteAudioRef.current.play().catch(() => undefined);
        }
      };
      pc.oniceconnectionstatechange = () => {
        setIceState(pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          setError(
            "Voice could not connect directly. Both sides may be behind strict mobile networks — a relay (TURN) is needed. The call was not charged.",
          );
          void finishCall("failed", { notifyPeer: true });
        }
      };
      return pc;
    },
    [finishCall],
  );

  const ensureLocalAudio = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      setError("Microphone unavailable — allow microphone access to make voice calls.");
      console.error("getUserMedia failed:", err);
      return null;
    }
  }, [muted]);

  /** Subscribe to the per-call signalling channel; role decides the handlers. */
  const attachCallChannel = useCallback(
    (callId: string) => {
      const topic = voiceCallTopic(callId);
      const channel = acquireChannel(topic);
      callChannelRef.current = { topic, channel };
      // Promise first: subscribe can resolve before the chain returns.
      callChannelReadyRef.current = new Promise<void>((resolve) => {
        callChannelReadyResolveRef.current = resolve;
        setTimeout(resolve, 5000); // never block the call on subscribe
      });
      channel
        .on("broadcast", { event: "offer" }, async ({ payload }: { payload: SignalPayload }) => {
          if (payload.kind !== "offer" || roleRef.current !== "callee") return;
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await channel.send({
              type: "broadcast",
              event: "answer",
              payload: { kind: "answer", sdp: answer } as SignalPayload,
            });
          } catch (err) {
            console.error("answer failed:", err);
          }
        })
        .on("broadcast", { event: "answer" }, async ({ payload }: { payload: SignalPayload }) => {
          if (payload.kind !== "answer" || roleRef.current !== "caller") return;
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } catch (err) {
            console.error("setRemoteDescription(answer) failed:", err);
          }
        })
        .on("broadcast", { event: "ice" }, async ({ payload }: { payload: SignalPayload }) => {
          if (payload.kind !== "ice") return;
          const pc = pcRef.current;
          if (!pc || !pc.remoteDescription) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch {
            /* late candidate — harmless */
          }
        })
        .on("broadcast", { event: "accepted" }, async () => {
          if (roleRef.current !== "caller") return;
          clearRingTimeout();
          const pc = createPeerConnection(callId);
          const stream = await ensureLocalAudio();
          if (!stream) {
            await finishCall("failed", { notifyPeer: true });
            return;
          }
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          dispatch({ type: "ACCEPTED" });
          startDurationTimer();
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await channel.send({
              type: "broadcast",
              event: "offer",
              payload: { kind: "offer", sdp: offer } as SignalPayload,
            });
          } catch (err) {
            console.error("offer failed:", err);
            await finishCall("failed", { notifyPeer: true });
          }
        })
        .on("broadcast", { event: "declined" }, () => {
          toast.info(`${peerName || "The other side"} declined the call.`);
          // Caller posts the thread summary (role check inside).
          void finishCall("declined", { notifyPeer: false, postSummary: true });
        })
        .on("broadcast", { event: "missed" }, () => {
          void finishCall("missed", { notifyPeer: false, postSummary: true });
        })
        .on("broadcast", { event: "hangup" }, () => {
          void finishCall("ended", { notifyPeer: false, postSummary: true });
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") callChannelReadyResolveRef.current?.();
        });
      return channel;
    },
    [clearRingTimeout, createPeerConnection, ensureLocalAudio, finishCall, peerName, startDurationTimer],
  );

  /** Caller: create the call row, ring the peer, wait for accept. */
  const startCall = useCallback(async () => {
    if (stateRef.current.phase !== "idle") return;
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to make a voice call.");
      return;
    }
    myIdRef.current = user.id;
    const { data, error: insertErr } = await supabase
      .from("voice_calls")
      .insert({ caller_id: user.id, callee_id: peerId, status: "ringing" })
      .select("id")
      .single();
    if (insertErr || !data) {
      toast.error(friendlyErrorMessage(insertErr ?? new Error("Could not start the call.")));
      return;
    }
    const callId = (data as { id: string }).id;
    roleRef.current = "caller";
    dispatch({ type: "START_OUTGOING", callId });
    attachCallChannel(callId);
    // Ring the peer on their mailbox topic.
    const ringTopic = voiceCallRingTopic(peerId);
    const ringChannel = acquireChannel(ringTopic);
    ringChannel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void ringChannel
        .send({
          type: "broadcast",
          event: "ring",
          payload: { kind: "ring", callId, callerId: user.id } as SignalPayload,
        })
        .finally(() => {
          // Ring sent — release the throwaway sender channel after a beat
          // so the payload has time to flush.
          setTimeout(() => releaseChannel(ringTopic), 1500);
        });
    });
    ringTimeoutRef.current = setTimeout(() => {
      void finishCall("missed", { notifyPeer: true });
      toast.info("No answer — call marked as missed.");
    }, RING_TIMEOUT_MS);
  }, [peerId, attachCallChannel, finishCall]);

  /** Callee: accept the ringing call. */
  const acceptCall = useCallback(async () => {
    const { callId } = stateRef.current;
    if (!callId || stateRef.current.phase !== "incoming") return;
    setError(null);
    const stream = await ensureLocalAudio();
    if (!stream) return;
    roleRef.current = "callee";
    attachCallChannel(callId);
    createPeerConnection(callId);
    const pc = pcRef.current;
    if (!pc) return;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    await updateCallRow(callId, { status: "accepted", answered_at: new Date().toISOString() });
    // Tell the caller we accepted — they create the offer.
    await callChannelReadyRef.current;
    await callChannelRef.current?.channel.send({
      type: "broadcast",
      event: "accepted",
      payload: { kind: "accepted", callId } as SignalPayload,
    });
    dispatch({ type: "ACCEPTED" });
    startDurationTimer();
  }, [attachCallChannel, createPeerConnection, ensureLocalAudio, startDurationTimer, updateCallRow]);

  const declineCall = useCallback(async () => {
    const { callId } = stateRef.current;
    if (!callId || stateRef.current.phase !== "incoming") return;
    roleRef.current = "callee";
    attachCallChannel(callId);
    await callChannelReadyRef.current;
    await finishCall("declined", { notifyPeer: true, postSummary: false });
  }, [attachCallChannel, finishCall]);

  const endCall = useCallback(async () => {
    const { phase } = stateRef.current;
    if (phase === "idle" || phase === "ended") return;
    const reason: VoiceCallEndReason = phase === "outgoing" ? "cancelled" : "ended";
    await finishCall(reason, { notifyPeer: true });
  }, [finishCall]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, []);

  // Incoming-ring listener: my mailbox topic. A ring is only honoured after
  // the voice_calls row is read back (RLS: participants only) and matches
  // this thread's peer — a forged ring from a third user fails that check
  // and is silently ignored. Only rings from the open thread's peer surface
  // here; a global listener (any thread) is still owed — see report.
  useEffect(() => {
    let cancelled = false;
    let topic: string | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      myIdRef.current = user.id;
      topic = voiceCallRingTopic(user.id);
      const channel = acquireChannel(topic);
      ringChannelRef.current = { topic, channel };
      channel
        .on("broadcast", { event: "ring" }, async ({ payload }: { payload: SignalPayload }) => {
          if (payload.kind !== "ring" || stateRef.current.phase !== "idle") return;
          const { data: row } = await supabase
            .from("voice_calls")
            .select("id, caller_id, callee_id, status")
            .eq("id", payload.callId)
            .maybeSingle();
          if (!row) return; // RLS denied or no such call — ignore the ring.
          if (row.callee_id !== user.id || row.caller_id !== peerId || row.status !== "ringing") return;
          dispatch({ type: "RING_RECEIVED", callId: payload.callId, callerId: payload.callerId });
        })
        .on("broadcast", { event: "missed" }, ({ payload }: { payload: SignalPayload }) => {
          if (payload.kind !== "missed") return;
          if (stateRef.current.phase === "incoming" && stateRef.current.callId === payload.callId) {
            dispatch({ type: "END", reason: "missed" });
            if (endFlashRef.current) clearTimeout(endFlashRef.current);
            endFlashRef.current = setTimeout(() => dispatch({ type: "RESET" }), 4000);
          }
        })
        .on("broadcast", { event: "cancelled" }, ({ payload }: { payload: SignalPayload }) => {
          if (payload.kind !== "cancelled") return;
          if (stateRef.current.phase === "incoming" && stateRef.current.callId === payload.callId) {
            dispatch({ type: "END", reason: "cancelled" });
            if (endFlashRef.current) clearTimeout(endFlashRef.current);
            endFlashRef.current = setTimeout(() => dispatch({ type: "RESET" }), 4000);
          }
        })
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (topic) {
        releaseChannel(topic);
        ringChannelRef.current = null;
      }
    };
  }, [peerId]);

  // Full teardown on unmount.
  useEffect(() => {
    return () => {
      stopTimer();
      clearRingTimeout();
      if (endFlashRef.current) clearTimeout(endFlashRef.current);
      closePeerConnection();
      detachCallChannel();
    };
  }, [stopTimer, clearRingTimeout, closePeerConnection, detachCallChannel]);

  return {
    phase: state.phase,
    callId: state.callId,
    callerId: state.callerId,
    endReason: state.endReason,
    muted,
    durationSeconds,
    iceState,
    error,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
}

export type UseVoiceCallReturn = ReturnType<typeof useVoiceCall>;
