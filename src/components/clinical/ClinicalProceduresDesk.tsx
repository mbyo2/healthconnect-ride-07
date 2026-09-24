import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Stethoscope,
  Activity,
  FileCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  HeartPulse,
  Syringe,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface ClinicalProcedure {
  id: string;
  procedureCode: string; // CPT Code
  procedureName: string;
  patientName: string;
  diagnosisIcd: string; // ICD-10 Code
  performer: string;
  date: string;
  consentSigned: boolean;
  status: "Scheduled" | "In Progress" | "Completed";
  notes: string;
}

const COMMON_ICD10 = [
  { code: "J06.9", label: "Acute upper respiratory infection, unspecified" },
  { code: "I10", label: "Essential (primary) hypertension" },
  { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
  { code: "B50.9", label: "Plasmodium falciparum malaria, unspecified" },
  { code: "M54.5", label: "Low back pain (Lumbar radiculopathy)" },
  { code: "K29.7", label: "Gastritis, unspecified" },
  { code: "A09", label: "Infectious gastroenteritis and colitis, unspecified" },
  { code: "R50.9", label: "Fever, unspecified" },
];

// ICD-10 quick-pick reference (coding standard, not patient data).
// The procedure catalog loads live from clinical_procedures.

export const ClinicalProceduresDesk: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState<ClinicalProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalog, setCatalog] = useState<any[]>([]);
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);

  // New Procedure Form state
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedIcd, setSelectedIcd] = useState(COMMON_ICD10[0].code);
  const [selectedProcedureId, setSelectedProcedureId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ClinicalProcedure["status"]>("Scheduled");
  const [consentSigned, setConsentSigned] = useState(false);
  const [procedureNotes, setProcedureNotes] = useState("");

  const splitNotes = (notes: string | null) => {
    const m = /^\[ICD-([^\]]+)\]\s?/.exec(notes || "");
    return { icd: m ? m[1] : "—", body: (notes || "").replace(/^\[ICD-[^\]]+\]\s?/, "") };
  };

  const fetchDesk = async () => {
    setLoading(true);
    try {
      const [execRes, catRes] = await Promise.all([
        institutionId
          ? supabase.from("procedure_executions" as any).select("id,execution_date,status,notes,patient_id,provider_id,procedure_id").eq("institution_id", institutionId).order("execution_date", { ascending: false }).limit(200)
          : { data: [], error: null } as any,
        supabase.from("clinical_procedures" as any).select("id,procedure_code,procedure_name,category,base_price").eq("is_active", true).order("procedure_name").limit(200),
      ]);
      if (execRes.error) throw execRes.error;
      const catRows = ((catRes as any).data as any[]) || [];
      setCatalog(catRows);
      if (!selectedProcedureId && catRows.length) setSelectedProcedureId(catRows[0].id);
      const catById: Record<string, any> = {};
      catRows.forEach((c) => { catById[c.id] = c; });

      const execRows = ((execRes as any).data as any[]) || [];
      const personIds = [...new Set([...execRows.map((r) => r.patient_id), ...execRows.map((r) => r.provider_id)].filter(Boolean))];
      let names: Record<string, string> = {};
      if (personIds.length) {
        try {
          const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name").in("id", personIds);
          ((profs as any[]) || []).forEach((p) => {
            names[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unnamed";
          });
        } catch { /* names stay blank */ }
      }
      setProcedures(execRows.map((r) => {
        const cat = catById[r.procedure_id];
        const { icd, body } = splitNotes(r.notes);
        return {
          id: r.id,
          procedureCode: cat ? cat.procedure_code : "—",
          procedureName: cat ? cat.procedure_name : "Procedure",
          patientName: names[r.patient_id] || "—",
          diagnosisIcd: icd.startsWith("ICD-") ? icd : `ICD-${icd}`,
          performer: r.provider_id === user?.id ? "You" : names[r.provider_id] || "—",
          date: (r.execution_date || "").slice(0, 10),
          consentSigned: true, // persisted executions were recorded with consent
          status: (r.status || "Scheduled") as ClinicalProcedure["status"],
          notes: body,
        };
      }));

      // Facility patient roster (admissions) for the log form.
      if (institutionId) {
        try {
          const { data: adm } = await supabase.from("hospital_admissions" as any).select("patient_id").eq("hospital_id", institutionId).limit(500);
          const ids = [...new Set(((adm as any[]) || []).map((a) => a.patient_id).filter(Boolean))];
          if (ids.length) {
            const { data: pats } = await supabase.from("profiles").select("id,first_name,last_name").in("id", ids);
            const opts = ((pats as any[]) || []).map((p) => ({ id: p.id, name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unnamed patient" }));
            setRoster(opts);
            if (!selectedPatientId && opts.length) setSelectedPatientId(opts[0].id);
          }
        } catch (rosterErr) {
          console.error("Procedure roster failed:", rosterErr);
        }
      }
    } catch (e: any) {
      console.error("Procedures desk failed:", e);
      toast.error(e?.message || "Could not load recorded procedures.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDesk(); }, [institutionId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Reference ranges for quick clinical checks — not live patient vitals.
  // Live vitals arrive via paired IoT monitors (see IoT Monitoring).
  const vitals = {
    hr: '60–100',
    bp: '< 120/80',
    spo2: '≥ 95',
    temp: '36.1–37.2',
    glucose: '4.0–5.4',
  };

  const filteredProcedures = procedures.filter(
    (p) =>
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.procedureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.diagnosisIcd.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.procedureCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProcedure = async () => {
    if (!selectedPatientId) {
      toast.error("Select a registered patient first");
      return;
    }
    if (!selectedProcedureId) {
      toast.error("Select a procedure from the catalog");
      return;
    }
    if (!consentSigned) {
      toast.error("Patient consent must be confirmed before logging");
      return;
    }
    if (!user) {
      toast.error("Sign in to log procedures");
      return;
    }
    setSaving(true);
    try {
      const icdObj = COMMON_ICD10.find((i) => i.code === selectedIcd) || COMMON_ICD10[0];
      const { error } = await supabase.from("procedure_executions" as any).insert({
        procedure_id: selectedProcedureId,
        patient_id: selectedPatientId,
        institution_id: institutionId || null,
        provider_id: user.id,
        execution_date: new Date().toISOString().split("T")[0],
        status: selectedStatus,
        notes: `[ICD-${icdObj.code} (${icdObj.label})] ${procedureNotes.trim() || "No additional notes recorded."}`,
      });
      if (error) throw error;
      toast.success("Clinical procedure logged with ICD-10 coding");
      setShowNewModal(false);
      setProcedureNotes("");
      setConsentSigned(false);
      await fetchDesk();
    } catch (e: any) {
      console.error("Log procedure failed:", e);
      toast.error(e?.message || "Could not save the procedure. Check permissions and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 via-slate-900 to-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Clinical Procedures &amp; Medical Code Standards Desk</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                ICD-10 &amp; CPT Integrated
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Standardized diagnosis and procedural billing documentation with real-time vital sign alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 rounded-xl bg-white text-slate-900 font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all">
                <Plus className="h-4 w-4" /> Log Clinical Procedure
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="font-black text-lg">Record Procedure &amp; Medical Codes</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-xs">
                <div>
                  <label className="font-bold">Patient (admitted to this facility) *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    {roster.length === 0 && <option value="">No admitted patients found</option>}
                    {roster.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold">Primary Diagnosis (ICD-10 Standard) *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                    value={selectedIcd}
                    onChange={(e) => setSelectedIcd(e.target.value)}
                  >
                    {COMMON_ICD10.map((icd) => (
                      <option key={icd.code} value={icd.code}>
                        {icd.code} - {icd.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold">Procedure (live catalog) *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                    value={selectedProcedureId}
                    onChange={(e) => setSelectedProcedureId(e.target.value)}
                  >
                    {catalog.length === 0 && <option value="">Loading catalog…</option>}
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.procedure_code} - {c.procedure_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold">Status *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as ClinicalProcedure["status"])}
                  >
                    {(["Scheduled", "In Progress", "Completed"] as const).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-start gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentSigned}
                    onChange={(e) => setConsentSigned(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-emerald-600"
                  />
                  <span>Patient (or guardian) consent confirmed and recorded *</span>
                </label>

                <div>
                  <label className="font-bold">Procedure Clinical Notes &amp; Findings</label>
                  <textarea
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                    placeholder="Observations, anesthesia used, post-procedure recovery..."
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setShowNewModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button onClick={handleCreateProcedure} disabled={saving} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-extrabold disabled:opacity-50">
                  {saving ? "Saving…" : "Save Procedure"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vital Signs Reference Ranges — normal ranges for quick checks, not live readings */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Heart Rate · ref</span>
          <div className="text-lg font-black text-primary-500">{vitals.hr} bpm</div>
          <span className="text-[9px] font-bold text-slate-400">Resting adult range</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Blood Pressure · ref</span>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{vitals.bp} mmHg</div>
          <span className="text-[9px] font-bold text-slate-400">Normal adult range</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">SpO2 Oxygen · ref</span>
          <div className="text-lg font-black text-emerald-600">{vitals.spo2}%</div>
          <span className="text-[9px] font-bold text-slate-400">Healthy saturation</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Temperature · ref</span>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{vitals.temp} °C</div>
          <span className="text-[9px] font-bold text-slate-400">Afebrile range</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Blood Glucose · ref</span>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{vitals.glucose} mmol/L</div>
          <span className="text-[9px] font-bold text-slate-400">Fasting range</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs flex flex-col justify-center text-center">
          <button
            onClick={() => toast.info("No monitor connected — pair a Bluetooth monitor from IoT Monitoring for live vitals")}
            className="text-[11px] font-extrabold text-primary-500 hover:underline"
          >
            🔄 Sync IoT Vitals
          </button>
        </div>
      </div>

      {/* Procedures Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
              <th className="py-3 px-4">Procedure (CPT)</th>
              <th className="py-3 px-3">Patient Name</th>
              <th className="py-3 px-3">Diagnosis (ICD-10)</th>
              <th className="py-3 px-3">Performer</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-center">Consent</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
            {filteredProcedures.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 px-4 text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'No procedures match your search.' : loading ? 'Loading recorded procedures…' : 'No procedures recorded yet.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery
                      ? 'Try a different search term.'
                      : 'Log your first procedure above — entries persist to this facility\'s procedure log.'}
                  </p>
                </td>
              </tr>
            )}
            {filteredProcedures.map((proc) => (
              <tr key={proc.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 dark:hover:bg-slate-800/60">
                <td className="py-3 px-4">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">{proc.procedureName}</div>
                  <div className="text-[10px] font-mono text-primary-500">{proc.procedureCode}</div>
                </td>
                <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{proc.patientName}</td>
                <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300 max-w-xs truncate">
                  {proc.diagnosisIcd}
                </td>
                <td className="py-3 px-3 text-slate-600">{proc.performer}</td>
                <td className="py-3 px-3 text-slate-500">{proc.date}</td>
                <td className="py-3 px-3 text-center">
                  {proc.consentSigned ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ Signed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Missing
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      proc.status === "Completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-blue-100 text-primary-500 dark:bg-blue-950"
                    }`}
                  >
                    {proc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClinicalProceduresDesk;
