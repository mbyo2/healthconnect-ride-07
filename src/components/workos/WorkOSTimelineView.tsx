import React from "react";
import { PatientRecord, WORKOS_STATUS_CONFIG } from "./WorkOSTableBoard";
import { Calendar, Clock, User, Shield, Activity, ChevronLeft, ChevronRight } from "lucide-react";

interface WorkOSTimelineViewProps {
  patients: PatientRecord[];
  isDarkMode: boolean;
  onSelectPatient: (patient: PatientRecord) => void;
}

const TIME_SLOTS = [
  "08:00 AM", "10:00 AM", "12:00 PM", "02:00 PM",
  "04:00 PM", "06:00 PM", "08:00 PM", "10:00 PM"
];

export const WorkOSTimelineView: React.FC<WorkOSTimelineViewProps> = ({
  patients,
  isDarkMode,
  onSelectPatient,
}) => {
  return (
    <div className={`p-4 sm:p-6 overflow-x-auto transition-colors ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"}`}>
      <div className={`rounded-2xl border p-4 sm:p-6 min-w-[1000px] ${
        isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
      }`}>
        {/* Timeline Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h3 className="font-extrabold text-base tracking-tight">Today's Clinical Shift & Treatment Timeline</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Live Horizon • Aug 23, 2026
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className={`p-1.5 rounded-lg border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold px-2">Shift 1 (Day Operational)</span>
            <button className={`p-1.5 rounded-lg border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Timeline Grid Table */}
        <div className="mt-4">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-mono font-bold uppercase text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="col-span-4">Patient / Ward Unit</div>
            <div className="col-span-8 grid grid-cols-8 text-center">
              {TIME_SLOTS.map((slot) => (
                <div key={slot} className="truncate px-1">{slot}</div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">
            {patients.map((patient, idx) => {
              const statusConfig = WORKOS_STATUS_CONFIG[patient.status];
              // Calculate horizontal span based on patient progress / id
              const startCol = (idx % 4) + 1;
              const colSpan = Math.min(8 - startCol + 1, (idx % 5) + 3);

              return (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className="grid grid-cols-12 gap-2 py-3 items-center hover:bg-blue-500/5 transition-colors cursor-pointer rounded-lg"
                >
                  {/* Left Patient Detail */}
                  <div className="col-span-4 flex items-center gap-3 pr-2">
                    <img
                      src={patient.doctor.avatarUrl}
                      alt={patient.doctor.name}
                      className="h-7 w-7 rounded-full object-cover border border-blue-500/30 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">{patient.name}</div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                        <span className="font-mono text-blue-500">{patient.location}</span>
                        <span>•</span>
                        <span>{patient.doctor.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Timeline Bar Span */}
                  <div className="col-span-8 grid grid-cols-8 relative h-8 items-center bg-slate-100/50 dark:bg-slate-950/40 rounded-lg p-1">
                    <div
                      className={`h-6 rounded-md flex items-center justify-between px-2 text-[10px] font-bold text-white shadow-sm transition-all ${statusConfig.bg}`}
                      style={{
                        gridColumnStart: startCol,
                        gridColumnEnd: `span ${colSpan}`,
                      }}
                    >
                      <span className="truncate">{patient.symptoms}</span>
                      <span className="font-mono text-[9px] bg-black/20 px-1 rounded">{patient.vitalScore.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
