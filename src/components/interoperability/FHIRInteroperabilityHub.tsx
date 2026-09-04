import React, { useState } from "react";
import { toast } from "sonner";
import {
  Share2,
  FileCode,
  Download,
  Copy,
  CheckCircle2,
  RefreshCw,
  Server,
  Layers,
  Database,
  Code2,
  Sparkles,
} from "lucide-react";
import {
  toFHIRPatient,
  toFHIRObservation,
  createFHIRBundle,
  FHIRBundle,
} from "@/utils/fhir-standard";

export const FHIRInteroperabilityHub: React.FC<{ patientId?: string }> = ({ patientId }) => {
  const [selectedResourceType, setSelectedResourceType] = useState<string>("Patient");
  const [copied, setCopied] = useState(false);

  // Sample data for conversion
  const samplePatient = {
    id: patientId || "pat-88492-zm",
    first_name: "Chanda",
    last_name: "Mulenga",
    gender: "female",
    date_of_birth: "1994-06-18",
    phone: "+260 977 123 456",
    email: "chanda.mulenga@healthconnect.zm",
    city: "Lusaka",
    country: "Zambia",
  };

  const sampleVitals = [
    { id: "obs-1", metric_category: "vital_signs", metric_name: "Heart Rate", value: 72, unit: "beats/min", loinc_code: "8867-4", status: "normal", recorded_at: "2026-09-01T08:30:00Z" },
    { id: "obs-2", metric_category: "vital_signs", metric_name: "Blood Pressure Systolic", value: 118, unit: "mmHg", loinc_code: "8480-6", status: "normal", recorded_at: "2026-09-01T08:30:00Z" },
    { id: "obs-3", metric_category: "vital_signs", metric_name: "Body Temperature", value: 36.8, unit: "Cel", loinc_code: "8310-5", status: "normal", recorded_at: "2026-09-01T08:30:00Z" },
    { id: "obs-4", metric_category: "laboratory", metric_name: "Hemoglobin [Mass/volume] in Blood", value: 13.5, unit: "g/dL", loinc_code: "718-7", status: "normal", recorded_at: "2026-08-28T10:15:00Z" },
  ];

  const fhirPatient = toFHIRPatient(samplePatient);
  const fhirObservations = sampleVitals.map((v) => toFHIRObservation(v, samplePatient.id));
  const fullBundle: FHIRBundle = createFHIRBundle([fhirPatient, ...fhirObservations]);

  const displayedResource =
    selectedResourceType === "Patient"
      ? fhirPatient
      : selectedResourceType === "Observation"
      ? fhirObservations
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
    a.download = `fhir-${selectedResourceType.toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("FHIR resource bundle downloaded");
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] via-[#0f172a] to-[#1e293b] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              Standardized electronic health records exchange using LOINC, SNOMED-CT, RxNorm, and ICD-10 ontologies
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
            className="px-4 py-2 rounded-xl bg-white text-[#0f172a] font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all"
          >
            <Download className="h-4 w-4" /> Download FHIR Bundle
          </button>
        </div>
      </div>

      {/* Resource Selector Pills */}
      <div className="flex items-center gap-2 border-b border-[#e6e9ef] dark:border-slate-800 pb-2 overflow-x-auto">
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
                ? "bg-[#0073ea] text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#f0f2f7]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Live FHIR JSON Display */}
      <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-[#0f172a] text-emerald-400 p-6 shadow-md overflow-hidden font-mono text-xs relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">
              HL7 FHIR R4 Output • {selectedResourceType}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-sans">
            MIME: application/fhir+json
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
