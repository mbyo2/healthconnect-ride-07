import React from "react";
import { PatientRecord } from "./WorkOSTableBoard";
import { TrendingUp, Users, ArrowRight, DollarSign, Activity, Sparkles, Filter, CheckCircle2 } from "lucide-react";

interface WorkOSFunnelViewProps {
  patients: PatientRecord[];
  isDarkMode: boolean;
  onSelectPatient: (patient: PatientRecord) => void;
}

export const WorkOSFunnelView: React.FC<WorkOSFunnelViewProps> = ({
  patients,
  isDarkMode,
  onSelectPatient,
}) => {
  const triageCount = patients.filter((p) => p.groupName === "Emergency Triage").length;
  const icuCount = patients.filter((p) => p.groupName === "ICU & High Dependency").length;
  const outpatientCount = patients.filter((p) => p.groupName === "Outpatient & Telehealth").length;
  const dischargeCount = patients.filter((p) => p.groupName === "Discharge Pipeline" || p.status === "Done").length;

  const totalPatients = patients.length || 1;

  const funnelStages = [
    {
      stage: "1. Intake & Emergency Triage",
      count: triageCount,
      percent: Math.round((triageCount / totalPatients) * 100),
      color: "from-blue-600 to-indigo-600",
      textColor: "text-blue-500",
      borderColor: "border-blue-500/30",
      description: "Initial clinical triage & emergency score assessment",
    },
    {
      stage: "2. Active Diagnosis & Treatment",
      count: patients.filter((p) => p.status === "In Progress" || p.status === "Under Review").length,
      percent: Math.round(
        (patients.filter((p) => p.status === "In Progress" || p.status === "Under Review").length /
          totalPatients) *
          100
      ),
      color: "from-indigo-600 to-purple-600",
      textColor: "text-purple-500",
      borderColor: "border-purple-500/30",
      description: "Diagnostic workup, labs, radiology & specialist consults",
    },
    {
      stage: "3. ICU & High Dependency",
      count: icuCount,
      percent: Math.round((icuCount / totalPatients) * 100),
      color: "from-rose-600 to-pink-600",
      textColor: "text-rose-500",
      borderColor: "border-rose-500/30",
      description: "Intensive care monitoring & critical life-support",
    },
    {
      stage: "4. Outpatient Telehealth & Recovery",
      count: outpatientCount,
      percent: Math.round((outpatientCount / totalPatients) * 100),
      color: "from-emerald-600 to-[#00c875]",
      textColor: "text-emerald-500",
      borderColor: "border-emerald-500/30",
      description: "Remote monitoring, chronic disease management & therapy",
    },
    {
      stage: "5. Discharge & Clearance",
      count: dischargeCount,
      percent: Math.round((dischargeCount / totalPatients) * 100),
      color: "from-[#00c875] to-teal-500",
      textColor: "text-teal-500",
      borderColor: "border-teal-500/30",
      description: "Final billing settlement, medication release & discharge",
    },
  ];

  const totalBillingSum = patients.reduce((sum, p) => sum + p.billingZMW, 0);

  return (
    <div className={`p-4 sm:p-6 space-y-6 min-h-[700px] transition-colors ${
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"
    }`}>
      {/* Funnel Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Total Intake Pipeline</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono">{patients.length} Patients</div>
          <div className="mt-1 text-[11px] text-emerald-500 flex items-center gap-1 font-semibold">
            <TrendingUp className="h-3 w-3" />
            <span>+14.2% intake velocity vs last week</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Stage Conversion Rate</span>
            <Filter className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono">82.4%</div>
          <div className="mt-1 text-[11px] text-purple-400 font-semibold">
            Average 18 hrs per stage completion
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Discharge Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-500">94.8%</div>
          <div className="mt-1 text-[11px] text-slate-400">Zero unplanned readmissions</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Total Pipeline Billing</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-500">
            ZMW K{totalBillingSum.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Est. gross operational revenue</div>
        </div>
      </div>

      {/* Main Funnel Visualization */}
      <div className={`p-6 rounded-2xl border space-y-6 ${
        isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>Clinical CRM Pipeline Funnel</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Stage-by-stage patient flow from initial triage intake to final discharge
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold">
              5 Funnel Stages Active
            </span>
          </div>
        </div>

        {/* Visual Funnel Bars */}
        <div className="space-y-4 pt-2">
          {funnelStages.map((stage, idx) => {
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.textColor} bg-current`} />
                    <span>{stage.stage}</span>
                  </span>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400">{stage.description}</span>
                    <span className="text-slate-200 font-extrabold">{stage.count} Patients ({stage.percent}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-9 rounded-xl overflow-hidden p-1 flex items-center">
                  <div
                    className={`h-full rounded-lg bg-gradient-to-r ${stage.color} flex items-center justify-end px-3 text-white text-xs font-black transition-all duration-700 shadow-sm`}
                    style={{ width: `${Math.max(8, stage.percent)}%` }}
                  >
                    <span>{stage.percent}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
