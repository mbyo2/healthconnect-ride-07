import React from "react";
import { PatientRecord, PatientStatus, WORKOS_STATUS_CONFIG, WORKOS_PRIORITY_CONFIG } from "./WorkOSTableBoard";
import { Plus, ArrowRight, HeartPulse, User, Sparkles, ExternalLink, AlertTriangle } from "lucide-react";

interface WorkOSKanbanBoardProps {
  patients: PatientRecord[];
  isDarkMode: boolean;
  onStatusChange: (id: string, newStatus: PatientStatus) => void;
  onSelectPatient: (patient: PatientRecord) => void;
  onAddNewItem: () => void;
}

const KANBAN_STATUSES: PatientStatus[] = [
  "Stuck / Critical",
  "In Progress",
  "Under Review",
  "Scheduled",
  "Done",
];

export const WorkOSKanbanBoard: React.FC<WorkOSKanbanBoardProps> = ({
  patients,
  isDarkMode,
  onStatusChange,
  onSelectPatient,
  onAddNewItem,
}) => {
  const getNextStatus = (current: PatientStatus): PatientStatus => {
    const idx = KANBAN_STATUSES.indexOf(current);
    if (idx < KANBAN_STATUSES.length - 1) return KANBAN_STATUSES[idx + 1];
    return "Done";
  };

  return (
    <div className={`p-4 sm:p-6 overflow-x-auto min-h-[700px] transition-colors ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"}`}>
      <div className="flex items-start gap-4 min-w-[1300px] pb-6">
        {KANBAN_STATUSES.map((status) => {
          const columnPatients = patients.filter((p) => p.status === status);
          const statusConfig = WORKOS_STATUS_CONFIG[status];

          return (
            <div
              key={status}
              className={`w-[260px] sm:w-[290px] flex-shrink-0 rounded-2xl border flex flex-col max-h-[800px] ${
                isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 rounded-t-2xl border-b flex items-center justify-between ${
                isDarkMode ? "border-slate-800" : "border-slate-200"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusConfig.bg}`} />
                  <h3 className="font-extrabold text-sm tracking-tight">{status}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                  }`}>
                    {columnPatients.length}
                  </span>
                </div>

                <button
                  onClick={onAddNewItem}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Column Cards Container */}
              <div className="p-3 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                {columnPatients.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                    No patients in this stage
                  </div>
                ) : (
                  columnPatients.map((patient) => {
                    const priorityConfig = WORKOS_PRIORITY_CONFIG[patient.priority];

                    return (
                      <div
                        key={patient.id}
                        onClick={() => onSelectPatient(patient)}
                        className={`group p-3.5 rounded-xl border transition-all hover:shadow-md cursor-pointer relative overflow-hidden ${
                          isDarkMode
                            ? "bg-slate-950/80 border-slate-800 hover:border-blue-500/50"
                            : "bg-white border-slate-200 hover:border-blue-400"
                        }`}
                      >
                        {/* Priority Banner accent on top */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          patient.priority === "Urgent !!!" ? "bg-red-500 animate-pulse" : patient.priority === "High" ? "bg-amber-500" : "bg-blue-400"
                        }`} />

                        {/* Top patient line */}
                        <div className="flex items-start justify-between gap-2 mt-1">
                          <div>
                            <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
                              {patient.groupName}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                              {patient.name}
                            </h4>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] ${priorityConfig.bg}`}>
                            {patient.priority}
                          </span>
                        </div>

                        {/* Symptoms */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                          {patient.symptoms}
                        </p>

                        {/* AI Tag */}
                        <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 text-[10px] font-medium border border-purple-500/20">
                          <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          <span className="truncate">{patient.aiDiagnosticTag}</span>
                        </div>

                        {/* Doctor & Location */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={patient.doctor.avatarUrl}
                              alt={patient.doctor.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                              {patient.doctor.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            <HeartPulse className="h-3 w-3 text-rose-500" />
                            <span>{patient.vitalScore.split(' ')[0]}</span>
                          </div>
                        </div>

                        {/* Advance Action Button */}
                        {status !== "Done" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(patient.id, getNextStatus(status));
                            }}
                            className="mt-2.5 w-full py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span>Move to {getNextStatus(status)}</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
