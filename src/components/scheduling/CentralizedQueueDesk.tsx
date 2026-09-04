import React, { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Users,
  Tv,
  Volume2,
  PhoneCall,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Ticket,
  Building,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export interface QueueToken {
  id: string;
  tokenNumber: string;
  patientName: string;
  department: string;
  roomNumber: string;
  serviceType: "Consultation" | "Pharmacy" | "Lab Sample" | "Triage" | "Radiology";
  status: "Waiting" | "Called" | "In-Room" | "Served" | "No-Show";
  checkInTime: string;
  priority: "Normal" | "Urgent" | "Emergency";
}

const DEFAULT_TOKENS: QueueToken[] = [
  { id: "t-1", tokenNumber: "OPD-101", patientName: "Chanda Mulenga", department: "General OPD", roomNumber: "Room 102", serviceType: "Consultation", status: "In-Room", checkInTime: "08:15 AM", priority: "Normal" },
  { id: "t-2", tokenNumber: "PED-04", patientName: "Baby Joshua Tembo", department: "Pediatrics", roomNumber: "Pediatric Clinic", serviceType: "Consultation", status: "Called", checkInTime: "08:20 AM", priority: "Urgent" },
  { id: "t-3", tokenNumber: "LAB-12", patientName: "Grace Lungu", department: "Clinical Laboratory", roomNumber: "Phlebotomy Station", serviceType: "Lab Sample", status: "Waiting", checkInTime: "08:35 AM", priority: "Normal" },
  { id: "t-4", tokenNumber: "PHM-28", patientName: "Felix Mwape", department: "Main Pharmacy", roomNumber: "Counter 2", serviceType: "Pharmacy", status: "Waiting", checkInTime: "08:40 AM", priority: "Normal" },
  { id: "t-5", tokenNumber: "PT-02", patientName: "Ruth Chiluba", department: "Physiotherapy", roomNumber: "Rehab Gym", serviceType: "Consultation", status: "Waiting", checkInTime: "08:45 AM", priority: "Normal" },
];

export const CentralizedQueueDesk: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
  const [tokens, setTokens] = useState<QueueToken[]>(DEFAULT_TOKENS);
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenPatient, setNewTokenPatient] = useState("");
  const [newTokenDept, setNewTokenDept] = useState("General OPD");
  const [newTokenPriority, setNewTokenPriority] = useState<"Normal" | "Urgent" | "Emergency">("Normal");

  const handleCreateToken = () => {
    if (!newTokenPatient) {
      toast.error("Please enter patient name");
      return;
    }
    const prefix = newTokenDept.includes("Pediatric") ? "PED" : newTokenDept.includes("Pharmacy") ? "PHM" : newTokenDept.includes("Lab") ? "LAB" : "OPD";
    const num = Math.floor(100 + Math.random() * 900);
    const token: QueueToken = {
      id: `tok-${Date.now()}`,
      tokenNumber: `${prefix}-${num}`,
      patientName: newTokenPatient,
      department: newTokenDept,
      roomNumber: "Consultation Room 1",
      serviceType: "Consultation",
      status: "Waiting",
      checkInTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      priority: newTokenPriority,
    };
    setTokens([...tokens, token]);
    toast.success(`Token ${token.tokenNumber} generated for ${token.patientName}`);
    setShowNewTokenModal(false);
    setNewTokenPatient("");
  };

  const handleCallToken = (token: QueueToken) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === token.id ? { ...t, status: "Called" } : t))
    );

    // Audio chime simulation
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio context fallback
    }

    toast.success(`📢 Calling Token ${token.tokenNumber}: ${token.patientName} to ${token.roomNumber}`);
  };

  const handleSetStatus = (id: string, newStatus: QueueToken["status"]) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    toast.info(`Token status updated to ${newStatus}`);
  };

  const waitingCount = tokens.filter((t) => t.status === "Waiting" || t.status === "Called").length;
  const inRoomCount = tokens.filter((t) => t.status === "In-Room").length;
  const servedCount = tokens.filter((t) => t.status === "Served").length;

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0073ea] via-[#0f172a] to-[#1e293b] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/20">
            <Ticket className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Central Appointment Desk &amp; Live Queue Desk</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                Live TV Synced
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Real-time patient tokens, audio chime announcements, service room routing &amp; public waiting room displays
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/queue-display"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 border border-white/20 transition-all"
          >
            <Tv className="h-4 w-4" />
            <span>Open Public TV Display</span>
          </Link>
          <Dialog open={showNewTokenModal} onOpenChange={setShowNewTokenModal}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 rounded-xl bg-white text-[#0f172a] font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all">
                <Plus className="h-4 w-4" /> Issue Walk-in Token
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="font-black text-lg">Generate Queue Token</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-xs">
                <div>
                  <label className="font-bold">Patient Name *</label>
                  <input
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4]"
                    placeholder="Enter full name"
                    value={newTokenPatient}
                    onChange={(e) => setNewTokenPatient(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-bold">Target Department</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
                    value={newTokenDept}
                    onChange={(e) => setNewTokenDept(e.target.value)}
                  >
                    <option value="General OPD">General OPD</option>
                    <option value="Pediatrics Center">Pediatrics Center</option>
                    <option value="Physiotherapy Center">Physiotherapy Center</option>
                    <option value="Main Pharmacy">Main Pharmacy</option>
                    <option value="Clinical Laboratory">Clinical Laboratory</option>
                    <option value="Radiology & Imaging">Radiology &amp; Imaging</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold">Triage Priority</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[#c3c6d4] font-bold bg-white dark:bg-slate-950"
                    value={newTokenPriority}
                    onChange={(e) => setNewTokenPriority(e.target.value as any)}
                  >
                    <option value="Normal">Normal Walk-in</option>
                    <option value="Urgent">Urgent Consultation</option>
                    <option value="Emergency">Emergency Immediate</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setShowNewTokenModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button onClick={handleCreateToken} className="px-5 py-2.5 rounded-xl bg-[#0073ea] text-white font-extrabold">Generate Token</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Waiting in Queue</span>
          <div className="text-3xl font-black text-[#0073ea] mt-1">{waitingCount} Patients</div>
          <span className="text-[10px] font-bold text-slate-500">Avg Wait: 8 mins</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Currently in Consultation</span>
          <div className="text-3xl font-black text-amber-500 mt-1">{inRoomCount} Active</div>
          <span className="text-[10px] font-bold text-slate-500">Across 6 Consultation Rooms</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Completed / Served Today</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{servedCount + 34} Served</div>
          <span className="text-[10px] font-bold text-emerald-600">✓ On Track</span>
        </div>
      </div>

      {/* Live Queue Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 text-[11px] font-extrabold uppercase text-[#676879]">
              <th className="py-3 px-4">Token #</th>
              <th className="py-3 px-3">Patient Name</th>
              <th className="py-3 px-3">Department</th>
              <th className="py-3 px-3">Assigned Room / Station</th>
              <th className="py-3 px-3">Check-in Time</th>
              <th className="py-3 px-3 text-center">Queue Status</th>
              <th className="py-3 px-3 text-center">Calling Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
            {tokens.map((tok) => (
              <tr key={tok.id} className="hover:bg-[#f0f2f7] dark:hover:bg-slate-800/60">
                <td className="py-3 px-4">
                  <div className="font-black font-mono text-sm text-[#0073ea]">{tok.tokenNumber}</div>
                  {tok.priority !== "Normal" && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[9px]">
                      {tok.priority}
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{tok.patientName}</td>
                <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">{tok.department}</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-500">{tok.roomNumber}</td>
                <td className="py-3 px-3 text-slate-500">{tok.checkInTime}</td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      tok.status === "In-Room"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : tok.status === "Called"
                        ? "bg-[#0073ea] text-white animate-pulse"
                        : tok.status === "Served"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    {tok.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleCallToken(tok)}
                      className="px-3 py-1 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Call
                    </button>
                    <select
                      value={tok.status}
                      onChange={(e) => handleSetStatus(tok.id, e.target.value as any)}
                      className="p-1 rounded-lg border border-[#c3c6d4] text-[11px] font-bold bg-white dark:bg-slate-800"
                    >
                      <option value="Waiting">Waiting</option>
                      <option value="In-Room">In-Room</option>
                      <option value="Served">Served</option>
                      <option value="No-Show">No-Show</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CentralizedQueueDesk;
