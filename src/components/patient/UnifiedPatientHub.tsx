import React, { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  FileText,
  Clock,
  HeartPulse,
  AlertTriangle,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Upload,
  Download,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface PatientRecord {
  id: string;
  mrn: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  lastVisit: string;
  documentsCount: number;
}

const DEFAULT_PATIENTS: PatientRecord[] = [
  { id: "pat-1", mrn: "MRN-2026-0081", name: "Chanda Mulenga", gender: "Female", age: 32, phone: "+260 977 123 456", bloodGroup: "O+", allergies: ["Penicillin", "Sulfa Drugs"], chronicConditions: ["Essential Hypertension"], lastVisit: "2026-09-01", documentsCount: 5 },
  { id: "pat-2", mrn: "MRN-2026-0082", name: "Baby Joshua Tembo", gender: "Male", age: 1, phone: "+260 966 345 678", bloodGroup: "A+", allergies: ["None Known"], chronicConditions: ["None"], lastVisit: "2026-09-01", documentsCount: 3 },
  { id: "pat-3", mrn: "MRN-2026-0083", name: "Ruth Chiluba", gender: "Female", age: 45, phone: "+260 955 789 012", bloodGroup: "B+", allergies: ["Aspirin / NSAIDs"], chronicConditions: ["Lumbar Spondylosis", "Type 2 Diabetes"], lastVisit: "2026-08-30", documentsCount: 8 },
  { id: "pat-4", mrn: "MRN-2026-0084", name: "Felix Mwape", gender: "Male", age: 29, phone: "+260 971 890 123", bloodGroup: "AB+", allergies: ["Latex"], chronicConditions: ["Asthma"], lastVisit: "2026-08-30", documentsCount: 4 },
];

export const UnifiedPatientHub: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [patients, setPatients] = useState<PatientRecord[]>(DEFAULT_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord>(DEFAULT_PATIENTS[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // New Patient Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    gender: "Female",
    age: 30,
    phone: "",
    bloodGroup: "O+",
    allergies: "None known",
    chronicConditions: "None",
  });

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
  );

  const handleAddPatient = () => {
    if (!newPatient.name) return;
    const p: PatientRecord = {
      id: `pat-${Date.now()}`,
      mrn: `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newPatient.name,
      gender: newPatient.gender,
      age: newPatient.age,
      phone: newPatient.phone || "+260 970 000 000",
      bloodGroup: newPatient.bloodGroup,
      allergies: newPatient.allergies.split(",").map((a) => a.trim()),
      chronicConditions: newPatient.chronicConditions.split(",").map((c) => c.trim()),
      lastVisit: new Date().toISOString().split("T")[0],
      documentsCount: 1,
    };
    setPatients([p, ...patients]);
    setSelectedPatient(p);
    toast.success(`Patient ${p.name} registered with ${p.mrn}`);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] via-[#0f172a] to-[#1e293b] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Central Patient Management &amp; Demographics Hub</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                Unified MRN Registry
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Medical record numbers, chronic disease tracking, clinical document storage, and comprehensive care timeline
            </p>
          </div>
        </div>

        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-xl bg-white text-[#0f172a] font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all">
              <UserPlus className="h-4 w-4" /> Register New Patient
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="font-black text-lg">New Patient Registration</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-bold">Full Name *</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold">Gender</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold"
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold">Age (Years)</label>
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <label className="font-bold">Phone Number</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                  placeholder="+260 970 000 000"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold">Allergies (Comma separated)</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                  placeholder="e.g. Penicillin, Peanuts"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold">Chronic Conditions</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                  placeholder="e.g. Hypertension, Asthma"
                  value={newPatient.chronicConditions}
                  onChange={(e) => setNewPatient({ ...newPatient, chronicConditions: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
              <button onClick={handleAddPatient} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Save &amp; Generate MRN</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Grid: Directory + Patient Detailed Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Directory */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, MRN #, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#c3c6d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:border-[#0073ea]"
            />
          </div>

          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatient.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0073ea]/10 border-[#0073ea] shadow-xs"
                      : "bg-white dark:bg-slate-900 border-[#e6e9ef] dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[10px] text-[#0073ea]">{p.mrn}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Last visit: {p.lastVisit}</span>
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 mt-1">{p.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>{p.gender}, {p.age} yrs</span>
                    <span>•</span>
                    <span>Blood: <strong>{p.bloodGroup}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Detailed Dossier */}
        <div className="lg:col-span-7 p-6 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6 text-xs">
          <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-4">
            <div>
              <span className="font-mono font-bold text-xs text-[#0073ea]">{selectedPatient.mrn}</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{selectedPatient.name}</h3>
              <p className="text-slate-400">{selectedPatient.gender} • {selectedPatient.age} years old • {selectedPatient.phone}</p>
            </div>
            <button
              onClick={() => toast.success(`Exported complete EMR Dossier for ${selectedPatient.name}`)}
              className="px-4 py-2 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs shadow-xs"
            >
              Export Full EMR (PDF)
            </button>
          </div>

          {/* Clinical Alerts / Allergies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Documented Allergies
              </span>
              <div className="mt-1 font-bold text-rose-900 dark:text-rose-200">
                {selectedPatient.allergies.join(", ")}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
              <span className="text-[10px] font-black uppercase text-[#0073ea] flex items-center gap-1">
                <HeartPulse className="h-3.5 w-3.5" /> Chronic Conditions
              </span>
              <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                {selectedPatient.chronicConditions.join(", ")}
              </div>
            </div>
          </div>

          {/* Clinical Document Repository */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 uppercase text-[11px]">
                Clinical Documents &amp; Imaging Reports ({selectedPatient.documentsCount} Files)
              </span>
              <button
                onClick={() => toast.success("Document uploaded to patient cloud vault")}
                className="px-3 py-1 rounded-lg border border-[#c3c6d4] text-[11px] font-bold hover:bg-[#f0f2f7] flex items-center gap-1"
              >
                <Upload className="h-3 w-3" /> Upload Document
              </button>
            </div>

            <div className="space-y-2">
              {[
                { name: "Discharge_Summary_August2026.pdf", type: "Discharge Summary", size: "340 KB" },
                { name: "Full_Blood_Count_Result.pdf", type: "Laboratory Report", size: "180 KB" },
                { name: "Chest_XRay_Digital_Scan.dcm", type: "DICOM Radiology", size: "12.4 MB" },
              ].map((doc, i) => (
                <div key={i} className="p-3 rounded-xl border border-[#e6e9ef] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-[#0073ea]" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{doc.name}</div>
                      <div className="text-[10px] text-slate-400">{doc.type} • {doc.size}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`Downloading ${doc.name}`)}
                    className="p-1.5 rounded-lg border hover:bg-[#0073ea] hover:text-white transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedPatientHub;
