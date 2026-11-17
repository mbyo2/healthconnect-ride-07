import { Mic, MicOff, Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCallDuration, type VoiceCallEndReason, type VoiceCallPhase } from "@/lib/voiceCallState";

interface VoiceCallOverlayProps {
  phase: VoiceCallPhase;
  peerName: string;
  durationSeconds: number;
  muted: boolean;
  iceState: string;
  error: string | null;
  endReason: VoiceCallEndReason | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}

const END_LABELS: Record<Exclude<VoiceCallEndReason, "ended">, string> = {
  declined: "Call declined",
  missed: "No answer — missed call",
  failed: "Call could not connect",
  cancelled: "Call cancelled",
};

/**
 * Voice-call overlay for a chat thread. PayPal shell: navy #003087 header
 * band, gold #FFC439 primary action, pale secondaries; fluid at phone
 * widths 360–430px; dark mode via `dark:` surfaces.
 */
export function VoiceCallOverlay({
  phase,
  peerName,
  durationSeconds,
  muted,
  iceState,
  error,
  endReason,
  remoteAudioRef,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
}: VoiceCallOverlayProps) {
  if (phase === "idle") return null;

  const statusLine =
    phase === "outgoing"
      ? `Calling ${peerName}…`
      : phase === "incoming"
        ? `Incoming voice call from ${peerName}`
        : phase === "active"
          ? formatCallDuration(durationSeconds)
          : endReason === "ended"
            ? `Call ended · ${formatCallDuration(durationSeconds)}`
            : END_LABELS[endReason ?? "failed"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-label="Voice call"
      aria-live="polite"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100">
        <div className="bg-[#003087] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden>
              {phase === "incoming" ? <PhoneIncoming className="h-5 w-5" /> : <PhoneOutgoing className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{peerName}</p>
              <p className="truncate text-sm text-white/80">Voice call · Doc&apos;O Clock</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 text-center">
          <p className="text-lg font-medium" data-testid="voice-call-status">{statusLine}</p>
          {phase === "active" && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {iceState === "connected" || iceState === "completed"
                ? "Connected — speak now"
                : iceState === "checking"
                  ? "Connecting…"
                  : `Connection: ${iceState}`}
            </p>
          )}
          {error && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          )}
          {!error && phase === "active" && iceState !== "connected" && iceState !== "completed" && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Connecting directly between your devices — no data leaves the call except the connection setup.
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 px-5 pb-6">
          {phase === "incoming" ? (
            <>
              <Button
                onClick={onDecline}
                variant="outline"
                size="lg"
                className="min-h-12 flex-1"
                aria-label="Decline call"
              >
                <PhoneOff className="mr-2 h-5 w-5" /> Decline
              </Button>
              <Button
                onClick={onAccept}
                size="lg"
                className="min-h-12 flex-1 bg-[#FFC439] text-[#1a1a1a] hover:bg-[#e6ae2e]"
                aria-label="Accept call"
              >
                <Phone className="mr-2 h-5 w-5" /> Accept
              </Button>
            </>
          ) : phase === "ended" ? (
            <Button onClick={onEnd} variant="outline" size="lg" className="min-h-12 flex-1" aria-label="Close">
              Close
            </Button>
          ) : (
            <>
              <Button
                onClick={onToggleMute}
                variant={muted ? "default" : "outline"}
                size="lg"
                className="min-h-12 min-w-12"
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                aria-pressed={muted}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <span className="ml-2 hidden min-[400px]:inline">{muted ? "Muted" : "Mute"}</span>
              </Button>
              <Button
                onClick={onEnd}
                size="lg"
                className="min-h-12 flex-1 bg-red-600 text-white hover:bg-red-700"
                aria-label="End call"
              >
                <PhoneOff className="mr-2 h-5 w-5" /> End call
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Remote audio — never rendered visibly; voice only. */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" data-testid="voice-call-remote-audio" />
    </div>
  );
}
