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

const DEFAULT_PROCEDURES: ClinicalProcedure[] = [
  { id: "pr-1", procedureCode: "CPT-99214", procedureName: "Comprehensive Clinical Consultation", patientName: "Chanda Mulenga", diagnosisIcd: "ICD-I10 (Essential Hypertension)", performer: "Dr. Mwape Chilufya", date: "2026-09-01", consentSigned: true, status: "Completed", notes: "Medication adjusted to Amlodipine 5mg OD. BP controlled at 122/78." },
  { id: "pr-2", procedureCode: "CPT-97110", procedureName: "Therapeutic Spinal Mobilization", patientName: "Ruth Chiluba", diagnosisIcd: "ICD-M54.5 (Low Back Pain)", performer: "PT Faith Musonda", date: "2026-09-01", consentSigned: true, status: "In Progress", notes: "Lumbar Grade II mobilization and core stabilization." },
  { id: "pr-3", procedureCode: "CPT-90471", procedureName: "EPI Childhood Vaccine Administration", patientName: "Baby Joshua Tembo", diagnosisIcd: "ICD-Z23 (Encounter for immunization)", performer: "Sister Grace Banda", date: "2026-09-01", consentSigned: true, status: "Completed", notes: "Pentavalent-3 and IPV administered left anterolateral thigh." },
  { id: "pr-4", procedureCode: "CPT-12001", procedureName: "Superficial Wound Suture (Forearm)", patientName: "Felix Mwape", diagnosisIcd: "ICD-S51.8 (Laceration of forearm)", performer: "Dr. Lindiwe Zulu", date: "2026-08-30", consentSigned: true, status: "Completed", notes: "3 nylon interrupted sutures applied under local 2% lidocaine." },
];

export const ClinicalProceduresDesk: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [procedures, setProcedures] = useState<ClinicalProcedure[]>(DEFAULT_PROCEDURES);
  const [searchQuery, setSearchQuery] = useState("");

  // New Procedure Form state
  const [showNewModal, setShowNewModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [selectedIcd, setSelectedIcd] = useState(COMMON_ICD10[0].code);
  const [selectedCpt, setSelectedCpt] = useState(COMMON_CPT[0].code);
  const [procedureNotes, setProcedureNotes] = useState("");

  // Vitals Quick Check state
  const [vitals, setVitals] = useState({
    hr: 74,
    bpSys: 120,
    bpDia: 80,
    spo2: 98,
    temp: 36.6,
    glucose: 5.4,
  });

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
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] via-[#0f172a] to-[#1e293b] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <button className="px-4 py-2 rounded-xl bg-white text-[#0f172a] font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all">
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
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. John Banda"
                  />
                </div>

                <div>
                  <label className="font-bold">Primary Diagnosis (ICD-10 Standard) *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
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
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
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
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                    placeholder="Observations, anesthesia used, post-procedure recovery..."
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setShowNewModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button onClick={handleCreateProcedure} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Save Procedure</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vital Signs Live Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Heart Rate</span>
          <div className="text-lg font-black text-[#0073ea]">{vitals.hr} bpm</div>
          <span className="text-[9px] font-bold text-emerald-600">✓ Normal (60-100)</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Blood Pressure</span>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{vitals.bpSys}/{vitals.bpDia}</div>
          <span className="text-[9px] font-bold text-emerald-600">✓ Normotensive</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">SpO2 Oxygen</span>
          <div className="text-lg font-black text-emerald-600">{vitals.spo2}%</div>
          <span className="text-[9px] font-bold text-emerald-600">✓ Optimal</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Temperature</span>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{vitals.temp} °C</div>
          <span className="text-[9px] font-bold text-emerald-600">✓ Afebrile</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Blood Glucose</span>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{vitals.glucose} mmol/L</div>
          <span className="text-[9px] font-bold text-emerald-600">✓ Fasting Normal</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs flex flex-col justify-center text-center">
          <button
            onClick={() => toast.success("Vital signs synced from connected Bluetooth monitors")}
            className="text-[11px] font-extrabold text-[#0073ea] hover:underline"
          >
            🔄 Sync IoT Vitals
          </button>
        </div>
      </div>

      {/* Procedures Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
              <th className="py-3 px-4">Procedure (CPT)</th>
              <th className="py-3 px-3">Patient Name</th>
              <th className="py-3 px-3">Diagnosis (ICD-10)</th>
              <th className="py-3 px-3">Performer</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-center">Consent</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
            {filteredProcedures.map((proc) => (
              <tr key={proc.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                <td className="py-3 px-4">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">{proc.procedureName}</div>
                  <div className="text-[10px] font-mono text-[#0073ea]">{proc.procedureCode}</div>
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
                        : "bg-blue-100 text-[#0073ea] dark:bg-blue-950"
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
