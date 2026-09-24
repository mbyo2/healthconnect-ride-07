import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Share2,
  FileCode,
  Download,
  Copy,
  CheckCircle2,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  toFHIRPatient,
  toFHIRObservation,
  createFHIRBundle,
  FHIRBundle,
} from "@/utils/fhir-standard";
import { supabase } from "@/integrations/supabase/client";

// LOINC mapping for the vital_signs columns we convert.
const VITAL_DEFS: { key: string; label: string; unit: string; loinc: string }[] = [
  { key: "heart_rate", label: "Heart Rate", unit: "beats/min", loinc: "8867-4" },
  { key: "blood_pressure_systolic", label: "Blood Pressure Systolic", unit: "mmHg", loinc: "8480-6" },
  { key: "blood_pressure_diastolic", label: "Blood Pressure Diastolic", unit: "mmHg", loinc: "8462-4" },
  { key: "temperature", label: "Body Temperature", unit: "Cel", loinc: "8310-5" },
  { key: "oxygen_saturation", label: "Oxygen Saturation", unit: "%", loinc: "2708-6" },
  { key: "respiratory_rate", label: "Respiratory Rate", unit: "breaths/min", loinc: "9279-2" },
  { key: "blood_glucose", label: "Blood Glucose", unit: "mg/dL", loinc: "15074-8" },
  { key: "weight", label: "Body Weight", unit: "kg", loinc: "29463-7" },
];

interface PatientOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const FHIRInteroperabilityHub: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [selectedResourceType, setSelectedResourceType] = useState<string>("Patient");
  const [copied, setCopied] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [vitals, setVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Real admitted-patient roster for this facility — never sample names.
  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: adm, error } = await supabase
          .from("hospital_admissions" as any)
          .select("patient_id")
          .eq("hospital_id", institutionId)
          .limit(500);
        if (error) throw error;
        const ids = [...new Set(((adm as any[]) || []).map((a) => a.patient_id).filter(Boolean))];
        if (!ids.length) { if (!cancelled) { setPatients([]); setLoading(false); } return; }
        const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name").in("id", ids);
        if (cancelled) return;
        const opts = ((profs as any[]) || []).map((p) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name }));
        setPatients(opts);
        if (opts.length && !selectedPatientId) setSelectedPatientId(opts[0].id);
      } catch (e: any) {
        console.error("FHIR roster failed:", e);
        toast.error(e?.message || "Could not load the patient roster.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  // Real profile + recorded vitals for the selected patient.
  useEffect(() => {
    if (!selectedPatientId) { setProfile(null); setVitals([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const [prof, vit] = await Promise.all([
          supabase.from("profiles").select("id,first_name,last_name,gender,date_of_birth,phone,email,city,address,state,zip_code").eq("id", selectedPatientId).maybeSingle(),
          supabase.from("vital_signs" as any).select("*").eq("user_id", selectedPatientId).order("recorded_at", { ascending: false }).limit(20),
        ]);
        if (cancelled) return;
        setProfile((prof as any).data || null);
        setVitals(((vit as any).data as any[]) || []);
      } catch (e) {
        console.error("FHIR patient load failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPatientId]);

  // Expand each vital_signs row into per-measurement metrics for conversion.
  const metrics = vitals.flatMap((row) =>
    VITAL_DEFS.filter((d) => row[d.key] !== null && row[d.key] !== undefined).map((d) => ({
      id: `${row.id}-${d.key}`,
      metric_category: "vital_signs",
      metric_name: d.label,
      value: row[d.key],
      unit: d.unit,
      loinc_code: d.loinc,
      recorded_at: row.recorded_at,
    }))
  );

  const fhirPatient = profile ? toFHIRPatient(profile) : null;
  const fhirObservations = profile ? metrics.map((m) => toFHIRObservation(m, profile.id)) : [];
  const fullBundle: FHIRBundle = createFHIRBundle([...(fhirPatient ? [fhirPatient] : []), ...fhirObservations]);

  const displayedResource =
    selectedResourceType === "Patient" ? fhirPatient || { note: "Select a patient to generate the Patient resource." }
    : selectedResourceType === "Observation" ? (fhirObservations.length ? fhirObservations : [{ note: "No recorded vitals for this patient yet." }])
    : fullBundle;

  const jsonString = JSON.stringify(displayedResource, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success("FHIR JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fhir-${selectedResourceType.toLowerCase()}-${selectedPatientId || "none"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("FHIR resource bundle downloaded");
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 via-slate-900 to-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">HL7 FHIR Interoperability &amp; Data Exchange Engine</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                HL7 FHIR R4 / R5
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Converts live patient records and recorded vitals to FHIR using LOINC-coded observations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 border border-white/20 transition-all"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!profile}
            className="px-4 py-2 rounded-xl bg-white text-slate-900 font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Download FHIR Bundle
          </button>
        </div>
      </div>

      {/* Real patient selector */}
      <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">
          <Users className="h-4 w-4 text-primary-500" /> Source patient (admitted to this facility)
        </div>
        {loading ? (
          <p className="text-xs text-slate-500 flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading roster…</p>
        ) : patients.length === 0 ? (
          <p className="text-xs text-slate-500">No admitted patients with records yet — convert output waits for real data.</p>
        ) : (
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-canvas-silk dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
            aria-label="Select patient for FHIR conversion"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.first_name || "") + " " + (p.last_name || "")} — {p.id.slice(0, 8)}
              </option>
            ))}
          </select>
        )}
        {profile && (
          <span className="text-[11px] text-slate-500">
            {metrics.length} recorded measurement{metrics.length === 1 ? "" : "s"} available for conversion
          </span>
        )}
      </div>

      {/* Resource Selector Pills */}
      <div className="flex items-center gap-2 border-b border-canvas-silk dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "Patient", label: "Patient Resource" },
          { id: "Observation", label: "Observation (Vitals & Labs)" },
          { id: "Bundle", label: "Full FHIR Collection Bundle" },
        ].map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedResourceType(r.id)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              selectedResourceType === r.id
                ? "bg-primary-500 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-canvas-mist dark:hover:bg-slate-800"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Live FHIR JSON Display */}
      <div className="rounded-3xl border border-canvas-silk dark:border-slate-800 bg-slate-900 text-emerald-400 p-6 shadow-md overflow-hidden font-mono text-xs relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">
              HL7 FHIR R4 Output • {selectedResourceType}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
            <FileCode className="h-3 w-3" /> MIME: application/fhir+json
          </span>
        </div>

        <pre className="overflow-x-auto max-h-[480px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
          {jsonString}
        </pre>
      </div>
    </div>
  );
};

export default FHIRInteroperabilityHub;
