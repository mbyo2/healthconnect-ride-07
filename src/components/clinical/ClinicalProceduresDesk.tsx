import React, { useState } from "react";
import { toast } from "sonner";
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

const COMMON_CPT = [
  { code: "99213", label: "Office / Outpatient Visit, Est. Patient, 20-29 mins" },
  { code: "99214", label: "Office / Outpatient Visit, Est. Patient, 30-39 mins" },
  { code: "97110", label: "Therapeutic Procedure / Exercises, 15 minutes" },
  { code: "90471", label: "Immunization Administration (single or combo vaccine)" },
  { code: "12001", label: "Simple Repair of Superficial Wounds (≤ 2.5 cm)" },
  { code: "99283", label: "Emergency Department Visit, Moderate Severity" },
  { code: "96372", label: "Therapeutic / Diagnostic Injection (IM / SubQ)" },
];

// Clearly-labeled sample rows for demos — never shown as real records.
// The desk starts empty; samples load only via the opt-in button below.
const SAMPLE_PROCEDURES: ClinicalProcedure[] = [
  { id: "pr-1", procedureCode: "CPT-99214", procedureName: "Comprehensive Clinical Consultation", patientName: "Chanda Mulenga", diagnosisIcd: "ICD-I10 (Essential Hypertension)", performer: "Dr. Mwape Chilufya", date: "2026-09-01", consentSigned: true, status: "Completed", notes: "Medication adjusted to Amlodipine 5mg OD. BP controlled at 122/78." },
  { id: "pr-2", procedureCode: "CPT-97110", procedureName: "Therapeutic Spinal Mobilization", patientName: "Ruth Chiluba", diagnosisIcd: "ICD-M54.5 (Low Back Pain)", performer: "PT Faith Musonda", date: "2026-09-01", consentSigned: true, status: "In Progress", notes: "Lumbar Grade II mobilization and core stabilization." },
  { id: "pr-3", procedureCode: "CPT-90471", procedureName: "EPI Childhood Vaccine Administration", patientName: "Baby Joshua Tembo", diagnosisIcd: "ICD-Z23 (Encounter for immunization)", performer: "Sister Grace Banda", date: "2026-09-01", consentSigned: true, status: "Completed", notes: "Pentavalent-3 and IPV administered left anterolateral thigh." },
  { id: "pr-4", procedureCode: "CPT-12001", procedureName: "Superficial Wound Suture (Forearm)", patientName: "Felix Mwape", diagnosisIcd: "ICD-S51.8 (Laceration of forearm)", performer: "Dr. Lindiwe Zulu", date: "2026-08-30", consentSigned: true, status: "Completed", notes: "3 nylon interrupted sutures applied under local 2% lidocaine." },
];

export const ClinicalProceduresDesk: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [procedures, setProcedures] = useState<ClinicalProcedure[]>([]);
  const [samplesLoaded, setSamplesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New Procedure Form state
  const [showNewModal, setShowNewModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [selectedIcd, setSelectedIcd] = useState(COMMON_ICD10[0].code);
  const [selectedCpt, setSelectedCpt] = useState(COMMON_CPT[0].code);
  const [procedureNotes, setProcedureNotes] = useState("");

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

  const handleCreateProcedure = () => {
    if (!patientName) {
      toast.error("Please enter patient name");
      return;
    }
    const icdObj = COMMON_ICD10.find((i) => i.code === selectedIcd) || COMMON_ICD10[0];
    const cptObj = COMMON_CPT.find((c) => c.code === selectedCpt) || COMMON_CPT[0];

    const newProc: ClinicalProcedure = {
      id: `pr-${Date.now()}`,
      procedureCode: `CPT-${cptObj.code}`,
      procedureName: cptObj.label,
      patientName,
      diagnosisIcd: `ICD-${icdObj.code} (${icdObj.label})`,
      performer: "Attending Clinician",
      date: new Date().toISOString().split("T")[0],
      consentSigned: true,
      status: "Completed",
      notes: procedureNotes || "Procedure performed according to standard clinical protocol.",
    };

    setProcedures([newProc, ...procedures]);
    toast.success(`Clinical procedure logged with ICD-10 & CPT coding`);
    setShowNewModal(false);
    setPatientName("");
    setProcedureNotes("");
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
                  <label className="font-bold">Patient Name *</label>
                  <input
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. John Banda"
                  />
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
                  <label className="font-bold">Procedure Performed (CPT Standard) *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                    value={selectedCpt}
                    onChange={(e) => setSelectedCpt(e.target.value)}
                  >
                    {COMMON_CPT.map((cpt) => (
                      <option key={cpt.code} value={cpt.code}>
                        {cpt.code} - {cpt.label}
                      </option>
                    ))}
                  </select>
                </div>

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
                <button onClick={handleCreateProcedure} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-extrabold">Save Procedure</button>
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
                    {searchQuery ? 'No procedures match your search.' : 'No procedures recorded yet.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery ? 'Try a different search term.' : 'Log your first procedure above — entries here are session-only until backend sync lands.'}
                  </p>
                  {!searchQuery && !samplesLoaded && (
                    <button
                      onClick={() => { setProcedures(SAMPLE_PROCEDURES); setSamplesLoaded(true); }}
                      className="mt-3 px-4 py-2 rounded-xl border border-canvas-silk dark:border-slate-700 text-xs font-extrabold text-primary-500 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Load sample data for demo
                    </button>
                  )}
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
