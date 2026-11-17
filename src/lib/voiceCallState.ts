/**
 * Pure voice-call state machine + formatting helpers (no WebRTC, no I/O —
 * unit-tested). The hook in `useVoiceCall` drives the live side effects;
 * this module decides what each event means.
 */

export type VoiceCallPhase =
  | "idle"
  | "outgoing" // ringing the callee
  | "incoming" // being rung
  | "active" // media flowing (or connecting)
  | "ended"; // terminal flash state, hook resets to idle shortly after

export type VoiceCallEndReason =
  | "ended" // either side hung up after answer
  | "declined"
  | "missed" // no answer within the ring window
  | "failed" // ICE / media failure
  | "cancelled"; // caller hung up while ringing

export type VoiceCallEvent =
  | { type: "START_OUTGOING"; callId: string }
  | { type: "RING_RECEIVED"; callId: string; callerId: string }
  | { type: "ACCEPTED" }
  | { type: "END"; reason: VoiceCallEndReason }
  | { type: "RESET" };

export interface VoiceCallState {
  phase: VoiceCallPhase;
  callId: string | null;
  callerId: string | null;
  endReason: VoiceCallEndReason | null;
}

export const initialVoiceCallState: VoiceCallState = {
  phase: "idle",
  callId: null,
  callerId: null,
  endReason: null,
};

export function voiceCallReducer(
  state: VoiceCallState,
  event: VoiceCallEvent,
): VoiceCallState {
  switch (event.type) {
    case "START_OUTGOING":
      if (state.phase !== "idle") return state;
      return { phase: "outgoing", callId: event.callId, callerId: null, endReason: null };
    case "RING_RECEIVED":
      if (state.phase !== "idle") return state;
      return { phase: "incoming", callId: event.callId, callerId: event.callerId, endReason: null };
    case "ACCEPTED":
      if (state.phase !== "outgoing" && state.phase !== "incoming") return state;
      return { ...state, phase: "active", endReason: null };
    case "END":
      if (state.phase === "idle") return state;
      return { ...state, phase: "ended", endReason: event.reason };
    case "RESET":
      return initialVoiceCallState;
    default:
      return state;
  }
}

export function formatCallDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** One-line call record shown in the chat thread (inserted as a message). */
export function callSummaryText(reason: VoiceCallEndReason, durationSeconds: number): string {
  switch (reason) {
    case "ended":
      return `Voice call · ${formatCallDuration(durationSeconds)}`;
    case "declined":
      return "Voice call · declined";
    case "missed":
      return "Voice call · missed";
    case "cancelled":
      return "Voice call · cancelled";
    case "failed":
      return "Voice call · could not connect";
    default:
      return "Voice call";
  }
}

/** Ring window: after this long with no answer the call is marked missed. */
export const RING_TIMEOUT_MS = 45_000;
