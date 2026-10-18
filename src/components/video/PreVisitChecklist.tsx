import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Mic,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Volume2,
  Clock,
  Stethoscope,
  ArrowRight,
} from "lucide-react";

interface PreVisitChecklistProps {
  providerName: string;
  specialty?: string | null;
  durationMinutes: number;
  onJoin: () => void;
  onCancel: () => void;
}

/**
 * Pre-visit screen shown before a video consultation starts.
 * Camera/mic permission check + live preview, what-to-prepare guidance,
 * what the visit covers, and expected duration — one clear primary action.
 */
export const PreVisitChecklist = ({
  providerName,
  specialty,
  durationMinutes,
  onJoin,
  onCancel,
}: PreVisitChecklistProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testDevices = async () => {
    setTesting(true);
    setCameraOk(null);
    setMicOk(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      setCameraOk(!!videoTrack && videoTrack.readyState === "live");
      setMicOk(!!audioTrack && audioTrack.readyState === "live");
    } catch {
      setCameraOk(false);
      setMicOk(false);
    } finally {
      setTesting(false);
    }
  };

  const devicesBlocked = cameraOk === false || micOk === false;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">
          Get ready for your visit
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {providerName}
          {specialty ? ` · ${specialty}` : ""} · about {durationMinutes} minutes
        </p>
      </div>

      {/* Device check */}
      <Card className="mb-4 rounded-2xl">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="text-[17px] font-semibold text-foreground">
              Check your camera and microphone
            </h2>
          </div>

          <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-muted">
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover"
              aria-label="Camera preview"
            />
            {cameraOk === null && !testing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Your preview will appear here
                </p>
              </div>
            )}
            {testing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <p className="text-sm text-muted-foreground">Testing…</p>
              </div>
            )}
          </div>

          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {cameraOk === null ? (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              ) : cameraOk ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-foreground">
                Camera {cameraOk === null ? "— not tested yet" : cameraOk ? "— working" : "— blocked"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {micOk === null ? (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              ) : micOk ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-foreground">
                Microphone {micOk === null ? "— not tested yet" : micOk ? "— working" : "— blocked"}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={testDevices}
            disabled={testing}
            className="min-h-[44px] w-full"
          >
            <Mic className="mr-2 h-4 w-4" />
            {testing ? "Testing…" : cameraOk === null ? "Test my camera and mic" : "Test again"}
          </Button>

          {devicesBlocked && (
            <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              Your browser blocked the camera or microphone. Tap the lock icon in
              your address bar, allow access, then test again. You can still join
              with audio only.
            </p>
          )}
        </CardContent>
      </Card>

      {/* What to prepare */}
      <Card className="mb-4 rounded-2xl">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-[17px] font-semibold text-foreground">
              Before you join
            </h2>
          </div>
          <ul className="space-y-2.5 text-[15px] text-foreground">
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Find a quiet, well-lit place where you won't be interrupted
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Have your ID and any current medicines nearby
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Use Wi-Fi or make sure you have enough mobile data
            </li>
            <li className="flex gap-2.5">
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              If your connection is weak, you can switch to audio-only during the visit
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* What the visit covers */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <h2 className="text-[17px] font-semibold text-foreground">
              What this visit covers
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            About {durationMinutes} minutes with {providerName}
          </div>
          <p className="text-[15px] text-foreground">
            Your doctor will talk through your symptoms, review your history,
            and decide on next steps — which may include a prescription, lab
            tests, or a follow-up visit. You'll get a written summary when the
            visit ends.
          </p>
        </CardContent>
      </Card>

      {/* Primary action */}
      <div className="space-y-2">
        <Button onClick={() => { stopStream(); onJoin(); }} className="min-h-[52px] w-full text-base">
          Join visit
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button variant="ghost" onClick={() => { stopStream(); onCancel(); }} className="min-h-[44px] w-full">
          Not now
        </Button>
      </div>
    </div>
  );
};
