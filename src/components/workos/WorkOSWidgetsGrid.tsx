import React from "react";
import {
  Activity,
  HeartPulse,
  Users,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Bed,
  CheckCircle2,
  Clock,
  PhoneCall
} from "lucide-react";

interface WorkOSWidgetsGridProps {
  isDarkMode: boolean;
  stats: {
    totalPatients: number;
    criticalAlerts: number;
    avgTriageMinutes: number;
    icuOccupancyPercent: number;
  };
}

export const WorkOSWidgetsGrid: React.FC<WorkOSWidgetsGridProps> = ({ isDarkMode, stats }) => {
  return (
    <div className={`p-4 sm:p-6 space-y-6 transition-colors ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"}`}>
      {/* Bento Top Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: ICU Occupancy */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ICU Bed Capacity</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Bed className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-rose-500">{stats.icuOccupancyPercent}%</span>
            <span className="text-xs font-semibold text-rose-400">Full (18/20 Beds)</span>
          </div>
          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.icuOccupancyPercent}%` }} />
          </div>
        </div>

        {/* Metric 2: Triage Speed */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Triage Speed</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-amber-500">{stats.avgTriageMinutes}m</span>
            <span className="text-xs font-semibold text-emerald-500">↓ 14% faster today</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Target: &lt; 15 mins per patient intake</p>
        </div>

        {/* Metric 3: Active Patient Flow */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Queue</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-blue-500">{stats.totalPatients}</span>
            <span className="text-xs font-semibold text-slate-400">Patients in Board</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">4 Group Sections • Live updates</p>
        </div>

        {/* Metric 4: Daily Revenue / Billing */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift Revenue (ZMW)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-500">K48,250</span>
            <span className="text-xs font-semibold text-emerald-400">+22% vs yesterday</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Medications & Consultations</p>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Clinical Triage Velocity Progress Bars */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border space-y-4 ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <h3 className="font-extrabold text-base tracking-tight">Clinical Stage Throughput Breakdown</h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
              Real-time Workflows
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Emergency Triage (Code Red/Yellow)</span>
                <span className="font-mono text-rose-500">85% Capacity (Critical)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full w-[85%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">ICU & Surgical Wards</span>
                <span className="font-mono text-purple-500">90% Occupancy</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full w-[90%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Outpatient Consultations & Telehealth</span>
                <span className="font-mono text-emerald-500">62% Active</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[62%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Pharmacy Medication Fulfillment</span>
                <span className="font-mono text-amber-500">94% Dispatched</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full w-[94%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: On-Call Doctors Roster */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <h3 className="font-extrabold text-base tracking-tight">On-Call Specialists</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-500">4 Active</span>
          </div>

          <div className="space-y-3">
            {[
              { name: "Dr. Mutale Mwansa", role: "Chief Cardiologist", status: "In Surgery", avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&auto=format&fit=crop&q=85" },
              { name: "Dr. Sarah Jenkins", role: "Emergency Trauma Lead", status: "On Duty", avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&auto=format&fit=crop&q=85" },
              { name: "Dr. Chisamba Banda", role: "Neurologist", status: "On Duty", avatar: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=100&auto=format&fit=crop&q=85" },
              { name: "Dr. Aisha Nkomo", role: "Pediatric Specialist", status: "In Teleconsult", avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&auto=format&fit=crop&q=85" },
            ].map((doc) => (
              <div key={doc.name} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img src={doc.avatar} alt={doc.name} className="h-8 w-8 rounded-full object-cover border border-emerald-500/30" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{doc.name}</div>
                    <div className="text-[10px] text-slate-400">{doc.role}</div>
                  </div>
                </div>

                <button className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors">
                  <PhoneCall className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
