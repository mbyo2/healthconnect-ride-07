import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Loader2, AlertTriangle, Stethoscope, ShieldCheck, Ambulance, Activity } from "lucide-react";
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

const URGENCY_META: Record<TriageResponse["urgency"], { label: string; pillColor: string; icon: React.ReactNode }> = {
  emergency: {
    label: "EMERGENCY DISPATCH",
    pillColor: "bg-[#e2445c] text-white",
    icon: <Ambulance className="h-4 w-4" />,
  },
  urgent: {
    label: "Urgent Visit Needed",
    pillColor: "bg-[#fdab3d] text-white",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  routine: {
    label: "Routine Checkup",
    pillColor: "bg-[#0073ea] text-white",
    icon: <Stethoscope className="h-4 w-4" />,
  },
  self_care: {
    label: "Self-Care Guidance",
    pillColor: "bg-[#00c875] text-white",
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
          { timeout: 3000, maximumAge: 60_000 }
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
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              Clinical Symptom Triage & Red Flag Protocol Board
              <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
            </h1>
            <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
              AI-assisted emergency detection, specialty recommendations, and automated provider booking
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Symptom Intake Card */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <div className="border-b border-[#e6e9ef] pb-3">
            <h2 className="font-extrabold text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-[#0073ea]" /> Symptom Intake Form
            </h2>
            <p className="text-xs text-[#676879] font-medium mt-0.5">
              All clinical inputs are encrypted and linked securely to your electronic health record.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="cc" className="font-extrabold text-[#676879] uppercase">Main Complaint / Symptom *</label>
              <input
                id="cc"
                placeholder="e.g. Sharp chest tightness for 2 hours, radiating to left shoulder"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                maxLength={500}
                className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
              />
            </div>

            <div>
              <label htmlFor="sy" className="font-extrabold text-[#676879] uppercase">Associated Symptoms (comma separated)</label>
              <input
                id="sy"
                placeholder="shortness of breath, sweating, mild nausea"
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="dur" className="font-extrabold text-[#676879] uppercase">Symptom Duration</label>
                <input
                  id="dur"
                  placeholder="e.g. 3 hours / 2 days"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-extrabold text-[#676879] uppercase">Discomfort Severity</label>
                  <span className="font-mono font-black text-sm text-[#0073ea]">{severity}/10</span>
                </div>
                <Slider
                  value={[severity]}
                  onValueChange={(v) => setSeverity(v[0] ?? 0)}
                  min={0}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="font-extrabold text-[#676879] uppercase">Relevant Medical Background (optional)</label>
              <textarea
                id="notes"
                placeholder="Current medications, known allergies, prior cardiac or chronic conditions..."
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full mt-1 p-2.5 rounded-md border border-[#c3c6d4] font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
              />
            </div>

            <button
              onClick={runAssessment}
              disabled={assessing}
              className="w-full py-3 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {assessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Evaluating Clinical Triage Model...</span>
                </>
              ) : (
                "Run AI Clinical Triage Protocol"
              )}
            </button>
          </div>
        </div>

        {/* Result Assessment Card */}
        {result && meta && (
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e6e9ef] pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-slate-900">Triage Assessment Results</h2>
                <p className="text-xs text-[#676879] mt-0.5">Recommended specialty: <strong>{result.recommended_specialty}</strong></p>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${meta.pillColor}`}>
                {meta.icon} {meta.label}
              </span>
            </div>

            {result.urgency === "emergency" && (
              <div className="p-4 rounded-xl border border-[#e2445c]/30 bg-[#e2445c]/10 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-[#e2445c] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-[#e2445c]">Emergency Response Dispatched</h3>
                  <p className="text-xs text-slate-700 mt-1">
                    {result.recommended_action} Call local emergency services (112 / 911) immediately.
                  </p>
                </div>
              </div>
            )}

            {result.red_flags.length > 0 && (
              <div className="p-3.5 rounded-xl border border-[#fdab3d]/30 bg-[#fdab3d]/5 text-xs">
                <p className="font-extrabold text-[#fdab3d] mb-1">Clinical Red Flags Detected:</p>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                  {result.red_flags.map((rf, i) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs space-y-1">
              <p className="font-extrabold text-[#676879] uppercase">Clinical Protocol Recommendation</p>
              <p className="text-slate-800 font-medium">{result.recommended_action}</p>
            </div>

            {result.reasoning && (
              <p className="text-[11px] text-[#676879] italic bg-[#f5f6f8] p-3 rounded-xl border border-[#e6e9ef]">
                Reasoning: {result.reasoning}
              </p>
            )}

            {result.urgency !== "emergency" && (
              <div className="pt-2 space-y-3">
                <p className="text-xs font-extrabold text-slate-900 uppercase">
                  {result.providers.length > 0 ? "Recommended Verified Specialists" : "No matching providers online"}
                </p>
                {result.providers.length === 0 && (
                  <button
                    onClick={() => navigate("/search")}
                    className="w-full py-2.5 rounded-xl border border-[#c3c6d4] bg-white font-bold text-xs text-[#0073ea] hover:bg-[#f0f2f7]"
                  >
                    Browse All Providers Index
                  </button>
                )}
                {result.providers.map((p) => {
                  const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Provider";
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
                      <div>
                        <p className="font-extrabold text-xs text-[#0073ea]">Dr. {name}</p>
                        <p className="text-[11px] text-[#676879]">
                          {p.specialty ?? result.recommended_specialty} {p.city ? `• ${p.city}` : ""} {p.rating ? `• ★ ${p.rating.toFixed(1)}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => bookProvider(p.id)}
                        disabled={booking === p.id}
                        className="px-4 py-1.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white text-xs font-extrabold flex items-center gap-1 shadow-xs"
                      >
                        {booking === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Book Appointment"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
