import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, FileText, Check, X, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyErrorMessage } from "@/utils/friendly-error";

interface SoapDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  key_symptoms: string[];
  medications_mentioned: string[];
  follow_up: string;
  uncertainties: string[];
  confidence: "high" | "medium" | "low";
}

type Phase = "consent" | "recording" | "review" | "saved";

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function AmbientScribe() {
  const { consultationId } = useParams<{ consultationId?: string }>();
  const [phase, setPhase] = useState<Phase>("consent");
  const [consented, setConsented] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState<SoapDraft | null>(null);
  const [editedDraft, setEditedDraft] = useState<SoapDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    return () => {
      stopRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecognition = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startRecording = () => {
    if (!consented) {
      toast.error("Patient consent is required before recording");
      return;
    }
    if (!SpeechRecognition) {
      toast.error("Live transcription is not supported in this browser. Use Chrome or Edge.");
      return;
    }
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setElapsed(0);

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      setTranscript(finalRef.current);
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Microphone access denied. Allow microphone to record.");
        stopRecording();
        setPhase("consent");
      }
    };
    rec.onend = () => {
      // Auto-restart while in recording phase (Chrome stops after pauses)
      if (phase === "recording" && recognitionRef.current) {
        try { rec.start(); } catch { /* noop */ }
      }
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setPhase("recording");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      toast.error("Could not start recording");
    }
  };

  const stopRecordingPhase = () => {
    stopRecognition();
    setInterim("");
    if (!finalRef.current.trim()) {
      toast.error("No speech captured. Try again.");
      setPhase("consent");
      return;
    }
    setPhase("review");
  };

  const generateNotes = async () => {
    const text = finalRef.current.trim();
    if (text.length < 20) {
      toast.error("Transcript too short to generate notes");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ambient-scribe", {
        body: { transcript: text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data.draft as SoapDraft);
      setEditedDraft(data.draft as SoapDraft);
      toast.success("Draft notes generated — review before approving");
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Could not generate notes"));
    } finally {
      setGenerating(false);
    }
  };

  const approveAndSave = async () => {
    if (!editedDraft) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("You must be signed in"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("scribe_sessions").insert({
        consultation_id: consultationId || null,
        provider_id: user.id,
        transcript_text: finalRef.current.trim(),
        generated_notes: editedDraft,
        status: "approved",
        patient_consented: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      });
      if (error) throw error;
      setPhase("saved");
      toast.success("Notes approved and saved to the clinical record");
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Could not save notes"));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    stopRecognition();
    finalRef.current = "";
    setTranscript("");
    setDraft(null);
    setEditedDraft(null);
    setPhase("consent");
    setConsented(false);
    toast.info("Scribe session discarded — nothing was saved");
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const editField = (key: keyof SoapDraft, value: string) => {
    if (!editedDraft) return;
    setEditedDraft({ ...editedDraft, [key]: value });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">AI Ambient Scribe</h1>
        <p className="text-[15px] text-muted-foreground mt-1">
          Transcribes your consultation and drafts SOAP notes.{" "}
          <span className="font-medium">You must review and approve every note before it is saved.</span>
        </p>
      </div>

      {phase === "consent" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[18px]">Before you record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[15px]">
                Recording a consultation requires the patient's <strong>explicit verbal consent</strong>.
                Tell them what is being recorded, why, and that they can ask you to stop at any time.
              </p>
            </div>
            <div className="flex items-center gap-3 min-h-[44px]">
              <Checkbox
                id="consent"
                checked={consented}
                onCheckedChange={(v) => setConsented(v === true)}
                className="h-5 w-5"
              />
              <Label htmlFor="consent" className="text-[15px] cursor-pointer">
                The patient has consented to audio transcription of this consultation
              </Label>
            </div>
            {!SpeechRecognition && (
              <p className="text-[13px] text-muted-foreground">
                Live transcription needs Chrome or Edge. In other browsers you can paste a transcript instead.
              </p>
            )}
            <Button onClick={startRecording} disabled={!consented} className="min-h-[44px] w-full sm:w-auto">
              <Mic className="h-4 w-4 mr-2" /> Start Recording
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "recording" && (
        <Card className="rounded-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-[15px] font-semibold text-red-600 dark:text-red-400">Recording</span>
                <Badge variant="outline" className="tabular-nums">{mm}:{ss}</Badge>
              </div>
              <Button variant="destructive" onClick={stopRecordingPhase} className="min-h-[44px]">
                <Square className="h-4 w-4 mr-2" /> Stop & Review
              </Button>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 min-h-[160px] max-h-[320px] overflow-y-auto">
              <p className="text-[15px] whitespace-pre-wrap">
                {transcript}
                <span className="text-muted-foreground">{interim}</span>
              </p>
              {!transcript && !interim && (
                <p className="text-[13px] text-muted-foreground">Listening… speak to begin transcribing.</p>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">
              Transcription runs in your browser. Audio is not uploaded anywhere.
            </p>
          </CardContent>
        </Card>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-[18px]">Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-muted/50 p-4 max-h-[200px] overflow-y-auto">
                <p className="text-[15px] whitespace-pre-wrap">{finalRef.current}</p>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button onClick={generateNotes} disabled={generating} className="min-h-[44px]">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  {generating ? "Generating draft…" : "Generate SOAP Notes"}
                </Button>
                <Button variant="outline" onClick={discard} className="min-h-[44px]">
                  <X className="h-4 w-4 mr-2" /> Discard
                </Button>
              </div>
            </CardContent>
          </Card>

          {editedDraft && (
            <Card className="rounded-2xl border-amber-300 dark:border-amber-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[18px]">Draft notes — review required</CardTitle>
                  <Badge variant="secondary">DRAFT</Badge>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  AI-generated draft{editedDraft.confidence ? ` · confidence: ${editedDraft.confidence}` : ""}.
                  Correct anything wrong before approving — nothing is saved until you approve.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    ["subjective", "Subjective"],
                    ["objective", "Objective"],
                    ["assessment", "Assessment"],
                    ["plan", "Plan"],
                    ["follow_up", "Follow-up"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-[15px] font-semibold">{label}</Label>
                    <Textarea
                      value={editedDraft[key] as string}
                      onChange={(e) => editField(key, e.target.value)}
                      rows={3}
                      className="text-[15px]"
                    />
                  </div>
                ))}
                {editedDraft.uncertainties?.length > 0 && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4">
                    <p className="text-[15px] font-semibold mb-1">Unclear in transcript</p>
                    <ul className="text-[14px] list-disc pl-5 space-y-0.5">
                      {editedDraft.uncertainties.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={approveAndSave} disabled={saving} className="min-h-[44px]">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Review complete — approve & save
                  </Button>
                  <Button variant="outline" onClick={discard} className="min-h-[44px]">
                    Discard draft
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {phase === "saved" && (
        <Card className="rounded-2xl">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-[18px] font-semibold">Notes approved and saved</p>
            <p className="text-[15px] text-muted-foreground">
              The reviewed SOAP notes are now part of the clinical record.
            </p>
            <Button variant="outline" onClick={() => { setPhase("consent"); setConsented(false); setDraft(null); setEditedDraft(null); }} className="min-h-[44px]">
              Start new session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
