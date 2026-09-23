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
import { useQueueTokens, type QueueToken as LiveQueueToken } from "@/hooks/useQueueTokens";

const PRIORITY_OPTIONS = [
  { value: "normal", label: "Normal Walk-in" },
  { value: "urgent", label: "Urgent Consultation" },
  { value: "emergency", label: "Emergency Immediate" },
] as const;

const STATUS_META: Record<LiveQueueToken["status"], { label: string; className: string }> = {
  waiting: { label: "Waiting", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  serving: { label: "Called", className: "bg-primary-500 text-white animate-pulse" },
  completed: { label: "Served", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 dark:bg-slate-800" },
  no_show: { label: "No-Show", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};

/**
 * Central queue desk backed by live queue_tokens — calling a token updates
 * the shared realtime board (and the public TV display) instantly. Nothing
 * here is sample data: an empty queue renders empty.
 */
export const CentralizedQueueDesk: React.FC<{ institutionId?: string }> = () => {
  const { tokens, loading, waiting, serving, completed, createToken, updateTokenStatus } =
    useQueueTokens();
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenPatient, setNewTokenPatient] = useState("");
  const [newTokenDept, setNewTokenDept] = useState("General OPD");
  const [newTokenPriority, setNewTokenPriority] = useState<"normal" | "urgent" | "emergency">("normal");
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateToken = async () => {
    if (!newTokenPatient.trim()) {
      toast.error("Please enter patient name");
      return;
    }
    setCreating(true);
    const created = await createToken({
      patient_name: newTokenPatient.trim(),
      department: newTokenDept,
      priority: newTokenPriority,
    });
    setCreating(false);
    if (created) {
      setShowNewTokenModal(false);
      setNewTokenPatient("");
    }
  };

  const chime = () => {
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
    } catch {
      // Audio context fallback — visual toast still fires
    }
  };

  const handleCallToken = async (token: LiveQueueToken) => {
    chime();
    await updateTokenStatus(token.id, "serving");
    toast.success(`Calling Token ${token.token_number}: ${token.patient_name}`);
  };

  const visible = tokens.filter(
    (t) =>
      !searchQuery ||
      t.token_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgWaitMins = (() => {
    if (waiting.length === 0) return null;
    const now = Date.now();
    const total = waiting.reduce((s, t) => {
      const at = new Date(t.check_in_time).getTime();
      return s + (Number.isFinite(at) ? Math.max(0, now - at) : 0);
    }, 0);
    return Math.round(total / waiting.length / 60000);
  })();

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 via-slate-900 to-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              Real-time patient tokens, audio chime announcements &amp; public waiting room displays
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/queue-display"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 border border-white/20 transition-all"
          >
            <Tv className="h-4 w-4" />
            <span>Open Public TV Display</span>
          </Link>
          <Dialog open={showNewTokenModal} onOpenChange={setShowNewTokenModal}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 rounded-xl bg-white text-slate-900 font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all">
                <Plus className="h-4 w-4" /> Issue Walk-in Token
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="font-black text-lg">Generate Queue Token</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-xs">
                <div>
                  <label htmlFor="queue-patient-name" className="font-bold">Patient Name *</label>
                  <input
                    id="queue-patient-name"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700"
                    placeholder="Enter full name"
                    value={newTokenPatient}
                    onChange={(e) => setNewTokenPatient(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="queue-department" className="font-bold">Target Department</label>
                  <select
                    id="queue-department"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
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
                  <label htmlFor="queue-priority" className="font-bold">Triage Priority</label>
                  <select
                    id="queue-priority"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-graphite-300 dark:border-slate-700 font-bold bg-white dark:bg-slate-950"
                    value={newTokenPriority}
                    onChange={(e) => setNewTokenPriority(e.target.value as any)}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setShowNewTokenModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button onClick={handleCreateToken} disabled={creating} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-extrabold disabled:opacity-50">
                  {creating ? "Generating…" : "Generate Token"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Waiting in Queue</span>
          <div className="text-3xl font-black text-primary-500 mt-1">{loading ? "—" : `${waiting.length} Patients`}</div>
          <span className="text-[10px] font-bold text-slate-500">
            {avgWaitMins === null ? "Queue clear" : `Avg Wait: ${avgWaitMins} min${avgWaitMins === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Currently Serving</span>
          <div className="text-3xl font-black text-amber-500 mt-1">{loading ? "—" : `${serving.length} Active`}</div>
          <span className="text-[10px] font-bold text-slate-500">Called to rooms</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Completed Today</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{loading ? "—" : `${completed.length} Served`}</div>
          <span className="text-[10px] font-bold text-emerald-600">Live count</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-graphite-400" aria-hidden />
        <input
          type="search"
          aria-label="Search queue by token, patient, or department"
          placeholder="Search queue…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Live Queue Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full min-w-[720px] text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-canvas-silk dark:border-slate-800 bg-canvas dark:bg-slate-950 text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
              <th className="py-3 px-4">Token #</th>
              <th className="py-3 px-3">Patient Name</th>
              <th className="py-3 px-3">Department</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Check-in Time</th>
              <th className="py-3 px-3 text-center">Queue Status</th>
              <th className="py-3 px-3 text-center">Calling Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-silk dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground" role="status" aria-label="Loading queue">
                  Loading live queue…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <p className="font-bold text-sm">Queue is clear</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? "No tokens match your search." : "Issue a walk-in token to get started."}
                  </p>
                </td>
              </tr>
            ) : (
              visible.map((tok) => {
                const meta = STATUS_META[tok.status];
                return (
                  <tr key={tok.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4">
                      <div className="font-black font-mono text-sm text-primary-500">{tok.token_number}</div>
                      {(tok.priority === "urgent" || tok.priority === "emergency") && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[9px] uppercase">
                          {tok.priority}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{tok.patient_name}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">{tok.department}</td>
                    <td className="py-3 px-3 text-slate-500 capitalize">{tok.priority}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {tok.check_in_time ? new Date(tok.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {tok.status === "waiting" && (
                          <button
                            onClick={() => handleCallToken(tok)}
                            aria-label={`Call token ${tok.token_number}`}
                            className="px-3 py-1 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs"
                          >
                            <Volume2 className="h-3.5 w-3.5" aria-hidden /> Call
                          </button>
                        )}
                        <select
                          value={tok.status}
                          aria-label={`Change status of token ${tok.token_number}`}
                          onChange={(e) => updateTokenStatus(tok.id, e.target.value as LiveQueueToken["status"])}
                          className="p-1 rounded-lg border border-graphite-300 dark:border-slate-700 text-[11px] font-bold bg-white dark:bg-slate-800"
                        >
                          <option value="waiting">Waiting</option>
                          <option value="serving">Serving</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no_show">No-Show</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Trust strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" aria-hidden /> Calling updates the public TV instantly</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> Wait times computed live</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed stays counted</span>
        <span className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5" aria-hidden /> Facility scope only</span>
        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden /> Token numbers only on TV</span>
        <span className="flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5" aria-hidden /> Status changes sync</span>
        <Sparkles className="h-3.5 w-3.5 text-primary-500" aria-hidden />
      </div>
    </div>
  );
};

export default CentralizedQueueDesk;
