import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Stethoscope, ShieldCheck, Ambulance } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

type TriageResponse = {
  session_id: string;
  urgency: "emergency" | "urgent" | "routine" | "self_care";
  recommended_specialty: string;
  red_flags: string[];
  recommended_action: string;
  reasoning: string;
  emergency_event_id: string | null;
  providers: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    specialty: string | null;
    rating: number | null;
    city: string | null;
  }>;
};

const URGENCY_META: Record<TriageResponse["urgency"], { label: string; className: string; icon: React.ReactNode }> = {
  emergency: {
    label: "Emergency",
    className: "bg-destructive text-destructive-foreground",
    icon: <Ambulance className="h-4 w-4" />,
  },
  urgent: {
    label: "Urgent (see today)",
    className: "bg-orange-500 text-white",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  routine: {
    label: "Routine",
    className: "bg-primary text-primary-foreground",
    icon: <Stethoscope className="h-4 w-4" />,
  },
  self_care: {
    label: "Self-care",
    className: "bg-emerald-600 text-white",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
};

export default function TriageIntake() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptomsText, setSymptomsText] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState<number>(3);
  const [extraNotes, setExtraNotes] = useState("");
  const [assessing, setAssessing] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResponse | null>(null);

  if (authLoading) return <LoadingScreen />;
  if (!user) {
    navigate("/auth");
    return null;
  }

  const runAssessment = async () => {
    if (!chiefComplaint.trim()) {
      toast.error("Please describe your main symptom.");
      return;
    }
    setAssessing(true);
    setResult(null);
    try {
      const symptomsList = symptomsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const location = await new Promise<GeolocationCoordinates | null>((resolve) => {
        if (!("geolocation" in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords),
          () => resolve(null),
          { timeout: 3000, maximumAge: 60_000 },
        );
      });

      const { data, error } = await supabase.functions.invoke<TriageResponse>("triage-assess", {
        body: {
          chiefComplaint: chiefComplaint.trim(),
          symptoms: symptomsList,
          duration: duration.trim() || undefined,
          severity,
          extraNotes: extraNotes.trim() || undefined,
          location: location
            ? { latitude: location.latitude, longitude: location.longitude }
            : undefined,
        },
      });

      if (error) throw error;
      if (!data) throw new Error("No response from triage service");
      setResult(data);

      if (data.urgency === "emergency") {
        toast.error("Emergency alert dispatched", {
          description: "Please stay on this page — help is being coordinated.",
        });
      }
    } catch (err: any) {
      toast.error("Triage failed", {
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setAssessing(false);
    }
  };

  const bookProvider = async (providerId: string) => {
    if (!user || !result) return;
    setBooking(providerId);
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + (result.urgency === "urgent" ? 2 : 24) * 60 * 60 * 1000);
      const dateStr = soon.toISOString().slice(0, 10);
      const timeStr = soon.toISOString().slice(11, 16);

      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          provider_id: providerId,
          date: dateStr,
          time: timeStr,
          appointment_date: dateStr,
          appointment_time: timeStr,
          type: "consultation",
          appointment_type: "consultation",
          status: "pending",
          notes: `Doc'O Clock triage (${result.urgency}). Recommended specialty: ${result.recommended_specialty}. ${result.reasoning}`,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Link the appointment back to the triage session.
      await (supabase as any)
        .from("patient_triage_sessions")
        .update({ appointment_id: appt.id, status: "booked" })
        .eq("id", result.session_id);

      toast.success("Appointment requested", { description: "The provider has been notified." });
      navigate("/appointments");
    } catch (err: any) {
      toast.error("Booking failed", {
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setBooking(null);
    }
  };

  const meta = result ? URGENCY_META[result.urgency] : null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Doc'O Clock Triage</h1>
        <p className="text-muted-foreground">
          Tell us what's going on. Our AI reviews red flags, recommends a specialty, and can book
          you in — or dispatch emergency help.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Symptom intake</CardTitle>
          <CardDescription>Everything you enter is private to your record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cc">Main complaint *</Label>
            <Input
              id="cc"
              placeholder="e.g. chest tightness for the last 2 hours"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sy">Other symptoms (comma separated)</Label>
            <Input
              id="sy"
              placeholder="shortness of breath, sweating, nausea"
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="dur">Duration</Label>
              <Input
                id="dur"
                placeholder="e.g. 3 days"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Severity: {severity}/10</Label>
              <Slider
                value={[severity]}
                onValueChange={(v) => setSeverity(v[0] ?? 0)}
                min={0}
                max={10}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Anything else? (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Medications, allergies, prior conditions…"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>

          <Button onClick={runAssessment} disabled={assessing} className="w-full">
            {assessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assessing…
              </>
            ) : (
              "Run AI triage"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && meta && (
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle>Assessment</CardTitle>
              <Badge className={`gap-1 ${meta.className}`}>
                {meta.icon}
                {meta.label}
              </Badge>
            </div>
            <CardDescription>Recommended specialty: <strong>{result.recommended_specialty}</strong></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.urgency === "emergency" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Emergency response initiated</AlertTitle>
                <AlertDescription>
                  {result.recommended_action} If you can, call your local emergency number now.
                  Our team has been alerted{result.emergency_event_id ? " with your location" : ""}.
                </AlertDescription>
              </Alert>
            )}

            {result.red_flags.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Red flags noted</div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {result.red_flags.map((rf, i) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm">
              <div className="font-medium mb-1">Recommendation</div>
              <p className="text-muted-foreground">{result.recommended_action}</p>
            </div>

            {result.reasoning && (
              <div className="text-xs text-muted-foreground italic">Reasoning: {result.reasoning}</div>
            )}

            {result.urgency !== "emergency" && (
              <div className="pt-2 space-y-2">
                <div className="text-sm font-medium">
                  {result.providers.length > 0
                    ? "Book with a recommended provider"
                    : "No matching verified providers right now"}
                </div>
                {result.providers.length === 0 && (
                  <Button variant="outline" className="w-full" onClick={() => navigate("/providers")}>
                    Browse all providers
                  </Button>
                )}
                {result.providers.map((p) => {
                  const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Provider";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">Dr. {name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.specialty ?? result.recommended_specialty}
                          {p.city ? ` · ${p.city}` : ""}
                          {p.rating ? ` · ★ ${p.rating.toFixed(1)}` : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => bookProvider(p.id)}
                        disabled={booking === p.id}
                      >
                        {booking === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
