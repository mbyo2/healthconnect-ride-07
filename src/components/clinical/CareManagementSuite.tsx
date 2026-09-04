import React, { useState } from "react";
import { toast } from "sonner";
import {
  BedDouble,
  Building,
  ArrowRightLeft,
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface InpatientBed {
  bedNumber: string;
  ward: string;
  patientName?: string;
  admissionDate?: string;
  admittingDoctor?: string;
  status: "Available" | "Occupied" | "Cleaning" | "Maintenance";
}

interface BedTransferLog {
  id: string;
  patientName: string;
  fromBed: string;
  toBed: string;
  date: string;
  reason: string;
}

const DEFAULT_BEDS: InpatientBed[] = [
  { bedNumber: "BED-ICU-01", ward: "Intensive Care Unit (ICU)", patientName: "Mwamba Chileshe", admissionDate: "2026-08-28", admittingDoctor: "Dr. Mwape Chilufya", status: "Occupied" },
  { bedNumber: "BED-ICU-02", ward: "Intensive Care Unit (ICU)", status: "Available" },
  { bedNumber: "BED-MED-101", ward: "Male Medical Ward", patientName: "Felix Mwape", admissionDate: "2026-08-30", admittingDoctor: "Dr. Lindiwe Zulu", status: "Occupied" },
  { bedNumber: "BED-MED-102", ward: "Male Medical Ward", status: "Available" },
  { bedNumber: "BED-PED-201", ward: "Pediatric Ward", patientName: "Baby Joshua Tembo", admissionDate: "2026-09-01", admittingDoctor: "Dr. Lindiwe Zulu", status: "Occupied" },
  { bedNumber: "BED-PED-202", ward: "Pediatric Ward", status: "Available" },
  { bedNumber: "BED-SURG-301", ward: "Surgical Recovery Ward", patientName: "Ruth Chiluba", admissionDate: "2026-08-31", admittingDoctor: "Dr. Mwape Chilufya", status: "Occupied" },
];

const DEFAULT_TRANSFERS: BedTransferLog[] = [
  { id: "tr-1", patientName: "Ruth Chiluba", fromBed: "BED-ICU-01", toBed: "BED-SURG-301", date: "2026-08-31", reason: "Post-op stability, stepped down to Surgical Ward" },
  { id: "tr-2", patientName: "Felix Mwape", fromBed: "Emergency Observation", toBed: "BED-MED-101", date: "2026-08-30", reason: "Formal IPD admission from Emergency Triage" },
];

export const CareManagementSuite: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<"opd" | "ipd" | "transfers" | "discharge">("ipd");
  const [beds, setBeds] = useState<InpatientBed[]>(DEFAULT_BEDS);
  const [transfers, setTransfers] = useState<BedTransferLog[]>(DEFAULT_TRANSFERS);

  // New Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferPatient, setTransferPatient] = useState("Mwamba Chileshe");
  const [transferFrom, setTransferFrom] = useState("BED-ICU-01");
  const [transferTo, setTransferTo] = useState("BED-MED-102");
  const [transferReason, setTransferReason] = useState("Stepped down to general medical ward");

  const handleBedTransfer = () => {
    const log: BedTransferLog = {
      id: `tr-${Date.now()}`,
      patientName: transferPatient,
      fromBed: transferFrom,
      toBed: transferTo,
      date: new Date().toISOString().split("T")[0],
      reason: transferReason,
    };
    setTransfers([log, ...transfers]);

    // Update beds
    setBeds((prev) =>
      prev.map((b) => {
        if (b.bedNumber === transferFrom) {
          return { ...b, status: "Available", patientName: undefined };
        }
        if (b.bedNumber === transferTo) {
          return { ...b, status: "Occupied", patientName: transferPatient, admissionDate: new Date().toISOString().split("T")[0] };
        }
        return b;
      })
    );

    toast.success(`Patient ${transferPatient} moved from ${transferFrom} to ${transferTo}`);
    setShowTransferModal(false);
  };

  const occupiedCount = beds.filter((b) => b.status === "Occupied").length;
  const availableCount = beds.filter((b) => b.status === "Available").length;

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] via-[#0f172a] to-[#1e293b] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <BedDouble className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Outpatient (OPD) &amp; Inpatient (IPD) Care Management</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                ADT &amp; Bed Movement
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              OPD service units, admission/discharge/transfer (ADT), ward bed occupancy &amp; discharge summaries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white/20 text-white font-bold text-xs">
            Occupancy: {occupiedCount} / {beds.length} Beds ({Math.round((occupiedCount / beds.length) * 100)}%)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e6e9ef] dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "ipd", label: "IPD Wards & Bed Grid", icon: BedDouble },
          { id: "transfers", label: "Bed Movements & Transfers", icon: ArrowRightLeft },
          { id: "discharge", label: "Discharge Summaries", icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#0073ea] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#f0f2f7]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. IPD Wards & Bed Grid */}
      {activeTab === "ipd" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Live Hospital Ward &amp; Bed Occupancy</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400">Real-time bed tracking across ICU, Medical, Pediatric, and Surgical Wards</p>
            </div>

            <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 rounded-xl bg-[#0073ea] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                  <ArrowRightLeft className="h-4 w-4" /> Initiate Bed Transfer
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg">Inpatient Bed Transfer Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold">Admitted Patient *</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                      value={transferPatient}
                      onChange={(e) => setTransferPatient(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold">Current Bed *</label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                        value={transferFrom}
                        onChange={(e) => setTransferFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-bold">Destination Bed *</label>
                      <select
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                      >
                        {beds.filter((b) => b.status === "Available").map((b) => (
                          <option key={b.bedNumber} value={b.bedNumber}>
                            {b.bedNumber} ({b.ward})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold">Clinical Transfer Reason</label>
                    <input
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                  <button onClick={handleBedTransfer} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Execute Transfer</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Bed Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {beds.map((b) => {
              const isOccupied = b.status === "Occupied";
              return (
                <div
                  key={b.bedNumber}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${
                    isOccupied
                      ? "bg-white dark:bg-slate-900 border-[#0073ea]/40 shadow-xs"
                      : "bg-slate-50/60 dark:bg-slate-950 border-dashed border-[#c3c6d4] dark:border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-black text-xs text-[#0073ea]">{b.bedNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isOccupied
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-slate-400">{b.ward}</div>

                    {isOccupied ? (
                      <div className="mt-3 p-2.5 rounded-xl bg-[#0073ea]/5 border border-[#0073ea]/20 text-xs">
                        <div className="font-black text-slate-900 dark:text-slate-100">{b.patientName}</div>
                        <div className="text-[10px] text-slate-500">Admitted: {b.admissionDate}</div>
                        <div className="text-[10px] text-[#0073ea] font-semibold">{b.admittingDoctor}</div>
                      </div>
                    ) : (
                      <div className="mt-3 p-4 rounded-xl border border-dashed text-center text-slate-400 text-xs font-semibold">
                        Ready for Admission
                      </div>
                    )}
                  </div>

                  {isOccupied && (
                    <button
                      onClick={() => toast.success(`Generated Discharge Summary for ${b.patientName}`)}
                      className="w-full py-1.5 rounded-xl border border-[#e6e9ef] hover:bg-[#0073ea] hover:text-white text-slate-700 dark:text-slate-300 font-extrabold text-[11px] transition-colors"
                    >
                      Discharge Patient
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Bed Transfers Log */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-3">From Bed</th>
                  <th className="py-3 px-3">To Destination Bed</th>
                  <th className="py-3 px-3">Transfer Date</th>
                  <th className="py-3 px-3">Clinical Indication / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{tr.patientName}</td>
                    <td className="py-3 px-3 font-mono text-rose-600 font-bold">{tr.fromBed}</td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-bold">{tr.toBed}</td>
                    <td className="py-3 px-3 text-slate-500">{tr.date}</td>
                    <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">{tr.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Discharge Summaries */}
      {activeTab === "discharge" && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                Official Electronic Discharge Summary Generator
              </h3>
              <button
                onClick={() => toast.success("Official Discharge Summary PDF exported")}
                className="px-4 py-2 rounded-xl bg-[#0073ea] text-white font-extrabold text-xs shadow-xs"
              >
                Export Discharge Summary (PDF)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold">Inpatient Admission No</label>
                <input className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]" value="ADM-2026-0491 (Ruth Chiluba)" readOnly />
              </div>
              <div>
                <label className="font-bold">Discharge Status</label>
                <input className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]" value="Recovered / Discharged to Outpatient Care" readOnly />
              </div>
            </div>

            <div>
              <label className="font-bold">Hospital Course &amp; Treatment Summary</label>
              <textarea
                rows={3}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                defaultValue="Patient underwent Lumbar L4-L5 decompression surgery on 2026-08-31. Post-operative period uneventful. Mobilized on Day 1 with Physiotherapy. Surgical site clean and dry without signs of infection. Oral analgesia prescribed for 7 days."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareManagementSuite;
