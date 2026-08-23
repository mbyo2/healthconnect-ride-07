import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  User,
  Plus,
  Sparkles,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  HeartPulse,
  DollarSign,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  FileText
} from "lucide-react";

export type PatientStatus = "Done" | "In Progress" | "Stuck / Critical" | "Under Review" | "Scheduled";
export type PriorityLevel = "Urgent !!!" | "High" | "Medium" | "Routine";

export interface PatientRecord {
  id: string;
  groupName: string;
  name: string;
  ageGender: string;
  symptoms: string;
  status: PatientStatus;
  priority: PriorityLevel;
  doctor: {
    name: string;
    avatarUrl: string;
    specialty: string;
  };
  location: string;
  vitalScore: string;
  timelineDays: number; // 1-100% progress
  billingZMW: number;
  aiDiagnosticTag: string;
  dateAdded: string;
}

interface WorkOSTableBoardProps {
  patients: PatientRecord[];
  isDarkMode: boolean;
  onStatusChange: (id: string, newStatus: PatientStatus) => void;
  onPriorityChange: (id: string, newPriority: PriorityLevel) => void;
  onSelectPatient: (patient: PatientRecord) => void;
  onAddNewPatientInGroup: (groupName: string) => void;
}

export const WORKOS_STATUS_CONFIG: Record<PatientStatus, { bg: string; text: string; shadow: string }> = {
  "Done": {
    bg: "bg-[#00c875]",
    text: "text-white font-bold",
    shadow: "shadow-sm shadow-[#00c875]/30",
  },
  "In Progress": {
    bg: "bg-[#fdab3d]",
    text: "text-white font-bold",
    shadow: "shadow-sm shadow-[#fdab3d]/30",
  },
  "Stuck / Critical": {
    bg: "bg-[#e2445c]",
    text: "text-white font-bold",
    shadow: "shadow-sm shadow-[#e2445c]/30 animate-pulse",
  },
  "Under Review": {
    bg: "bg-[#a25ddc]",
    text: "text-white font-bold",
    shadow: "shadow-sm shadow-[#a25ddc]/30",
  },
  "Scheduled": {
    bg: "bg-[#579bfc]",
    text: "text-white font-bold",
    shadow: "shadow-sm shadow-[#579bfc]/30",
  },
};

export const WORKOS_PRIORITY_CONFIG: Record<PriorityLevel, { bg: string; text: string }> = {
  "Urgent !!!": { bg: "bg-red-600/90 text-white font-extrabold" },
  "High": { bg: "bg-amber-500/90 text-white font-bold" },
  "Medium": { bg: "bg-blue-500/90 text-white font-bold" },
  "Routine": { bg: "bg-slate-400/80 text-white font-medium" },
};

const GROUP_COLORS: Record<string, string> = {
  "Emergency Triage": "#0073ea",
  "ICU & High Dependency": "#a25ddc",
  "Outpatient & Telehealth": "#00c875",
  "Discharge Pipeline": "#ff3d57",
};

export const WorkOSTableBoard: React.FC<WorkOSTableBoardProps> = ({
  patients,
  isDarkMode,
  onStatusChange,
  onPriorityChange,
  onSelectPatient,
  onAddNewPatientInGroup,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [activePriorityPopoverId, setActivePriorityPopoverId] = useState<string | null>(null);

  // Group patients by groupName
  const groupNames = Array.from(new Set(patients.map((p) => p.groupName)));

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className={`w-full overflow-x-auto p-4 sm:p-6 transition-colors ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"}`}>
      <div className="min-w-[1100px] space-y-6">
        {groupNames.map((groupName) => {
          const groupPatients = patients.filter((p) => p.groupName === groupName);
          const isCollapsed = collapsedGroups[groupName];
          const groupColor = GROUP_COLORS[groupName] || "#0073ea";

          // Calculate group stats summary
          const doneCount = groupPatients.filter((p) => p.status === "Done").length;
          const inProgressCount = groupPatients.filter((p) => p.status === "In Progress").length;
          const stuckCount = groupPatients.filter((p) => p.status === "Stuck / Critical").length;
          const totalBilling = groupPatients.reduce((sum, p) => sum + p.billingZMW, 0);

          return (
            <div
              key={groupName}
              className={`rounded-2xl border transition-all ${
                isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              {/* Group Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none rounded-t-2xl border-b border-slate-200 dark:border-slate-800"
                style={{ borderLeft: `6px solid ${groupColor}` }}
                onClick={() => toggleGroup(groupName)}
              >
                <div className="flex items-center gap-3">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ color: groupColor }}>
                    {groupName}
                  </h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {groupPatients.length} patients
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddNewPatientInGroup(groupName);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Group Table Body */}
              {!isCollapsed && (
                <div className="w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-[11px] font-extrabold uppercase tracking-wider border-b ${isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                        <th className="py-2.5 px-4 w-[240px]">Patient & Clinical Profile</th>
                        <th className="py-2.5 px-3 w-[150px] text-center">Status</th>
                        <th className="py-2.5 px-3 w-[120px] text-center">Priority</th>
                        <th className="py-2.5 px-3 w-[170px]">Assigned Doctor</th>
                        <th className="py-2.5 px-3 w-[130px]">Bed / Unit</th>
                        <th className="py-2.5 px-3 w-[130px]">Vitals Telemetry</th>
                        <th className="py-2.5 px-3 w-[140px]">Treatment Progress</th>
                        <th className="py-2.5 px-3 w-[130px] text-right">Est. Cost (ZMW)</th>
                        <th className="py-2.5 px-3 w-[160px]">AI Clinical Copilot</th>
                        <th className="py-2.5 px-2 w-[40px] text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                      {groupPatients.map((patient) => {
                        const statusConfig = WORKOS_STATUS_CONFIG[patient.status];
                        const priorityConfig = WORKOS_PRIORITY_CONFIG[patient.priority];

                        return (
                          <tr
                            key={patient.id}
                            className={`group hover:bg-blue-500/5 transition-colors cursor-pointer ${
                              isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-blue-50/40"
                            }`}
                            onClick={() => onSelectPatient(patient)}
                          >
                            {/* Patient Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                                  {patient.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                    <span>{patient.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400 font-normal">({patient.ageGender})</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                                    {patient.symptoms}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Cell (Monday Interactive Pill) */}
                            <td className="py-3 px-3 relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setActivePopoverId(activePopoverId === patient.id ? null : patient.id)}
                                className={`w-full py-1.5 px-2 rounded-lg text-xs transition-transform active:scale-95 flex items-center justify-center gap-1 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.shadow}`}
                              >
                                <span>{patient.status}</span>
                              </button>

                              {/* Status Dropdown Popover */}
                              {activePopoverId === patient.id && (
                                <div className={`absolute left-0 top-12 z-30 w-44 p-1.5 rounded-xl border shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 ${
                                  isDarkMode ? "bg-slate-900/95 border-slate-700" : "bg-white border-slate-200"
                                }`}>
                                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Set Status</div>
                                  {(Object.keys(WORKOS_STATUS_CONFIG) as PatientStatus[]).map((st) => (
                                    <button
                                      key={st}
                                      onClick={() => {
                                        onStatusChange(patient.id, st);
                                        setActivePopoverId(null);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold my-0.5 transition-all flex items-center justify-between ${WORKOS_STATUS_CONFIG[st].bg} text-white`}
                                    >
                                      <span>{st}</span>
                                      {patient.status === st && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Priority Cell */}
                            <td className="py-3 px-3 relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setActivePriorityPopoverId(activePriorityPopoverId === patient.id ? null : patient.id)}
                                className={`w-full py-1 px-2 rounded-md text-[11px] text-center transition-transform active:scale-95 ${priorityConfig.bg} ${priorityConfig.text}`}
                              >
                                {patient.priority}
                              </button>

                              {/* Priority Dropdown Popover */}
                              {activePriorityPopoverId === patient.id && (
                                <div className={`absolute left-0 top-11 z-30 w-36 p-1.5 rounded-xl border shadow-xl ${
                                  isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                                }`}>
                                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Priority</div>
                                  {(Object.keys(WORKOS_PRIORITY_CONFIG) as PriorityLevel[]).map((pr) => (
                                    <button
                                      key={pr}
                                      onClick={() => {
                                        onPriorityChange(patient.id, pr);
                                        setActivePriorityPopoverId(null);
                                      }}
                                      className={`w-full text-left px-2.5 py-1 rounded-md text-xs font-bold my-0.5 transition-all ${WORKOS_PRIORITY_CONFIG[pr].bg}`}
                                    >
                                      {pr}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Doctor Cell */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={patient.doctor.avatarUrl}
                                  alt={patient.doctor.name}
                                  className="h-6 w-6 rounded-full object-cover border border-blue-500/30"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs truncate text-slate-800 dark:text-slate-200">{patient.doctor.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{patient.doctor.specialty}</div>
                                </div>
                              </div>
                            </td>

                            {/* Bed Location */}
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border ${
                                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                              }`}>
                                {patient.location}
                              </span>
                            </td>

                            {/* Vitals Telemetry Score */}
                            <td className="py-3 px-3 font-mono">
                              <div className="flex items-center gap-1.5">
                                <HeartPulse className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                                <span className="font-bold text-xs">{patient.vitalScore}</span>
                              </div>
                            </td>

                            {/* Progress Timeline Bar */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                  <span>{patient.dateAdded}</span>
                                  <span>{patient.timelineDays}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${patient.timelineDays}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Billing ZMW */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              ZMW K{patient.billingZMW.toLocaleString()}
                            </td>

                            {/* AI Clinical Recommendation */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-[11px] font-medium">
                                <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
                                <span className="truncate">{patient.aiDiagnosticTag}</span>
                              </div>
                            </td>

                            {/* Row Action Trigger */}
                            <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onSelectPatient(patient)}
                                className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Monday.com Group Summary Footer */}
                  <div className={`px-4 py-2.5 border-t flex items-center justify-between text-xs font-semibold ${
                    isDarkMode ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50/80 border-slate-200 text-slate-600"
                  }`}>
                    <div className="flex items-center gap-4">
                      <span>Group Total: <strong>{groupPatients.length} items</strong></span>
                      <div className="hidden sm:flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00c875]" /> {doneCount} Done
                        <span className="w-2.5 h-2.5 rounded-full bg-[#fdab3d] ml-2" /> {inProgressCount} Active
                        <span className="w-2.5 h-2.5 rounded-full bg-[#e2445c] ml-2" /> {stuckCount} Critical
                      </div>
                    </div>

                    <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Subtotal: ZMW K{totalBilling.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
