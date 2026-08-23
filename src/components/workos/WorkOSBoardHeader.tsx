import React from "react";
import {
  Table,
  Kanban,
  Calendar,
  BarChart3,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Moon,
  Sun,
  Activity,
  UserCheck,
  AlertTriangle,
  Clock,
  Download,
  Share2,
  ChevronDown
} from "lucide-react";

export type BoardViewMode = "table" | "kanban" | "timeline" | "widgets" | "ai";

interface WorkOSBoardHeaderProps {
  currentView: BoardViewMode;
  onViewChange: (view: BoardViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGroupFilter: string;
  onGroupFilterChange: (group: string) => void;
  selectedPriorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  onAddNewItem: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  stats: {
    totalPatients: number;
    criticalAlerts: number;
    avgTriageMinutes: number;
    icuOccupancyPercent: number;
  };
}

export const WorkOSBoardHeader: React.FC<WorkOSBoardHeaderProps> = ({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  selectedGroupFilter,
  onGroupFilterChange,
  selectedPriorityFilter,
  onPriorityFilterChange,
  onAddNewItem,
  isDarkMode,
  onToggleDarkMode,
  stats,
}) => {
  return (
    <div className={`border-b transition-colors duration-200 ${isDarkMode ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
      {/* Top Workspace Header */}
      <div className="px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Status */}
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-md flex items-center justify-center text-white flex-shrink-0">
            <div className="w-full h-full bg-slate-950/20 backdrop-blur-sm rounded-[10px] flex items-center justify-center">
              <Activity className="h-6 w-6 text-white animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                Patient Triage & Operations WorkOS
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Sync
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                v3.8 • Zambia National Hub
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Monday.com-style high-velocity clinical queue, bed allocation & multi-modal AI dispatch
            </p>
          </div>
        </div>

        {/* Top Actions & Quick Stats */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Metrics Bar */}
          <div className={`hidden lg:flex items-center gap-4 px-3 py-1.5 rounded-xl border text-xs font-medium ${isDarkMode ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-100/80 border-slate-200/80"}`}>
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-blue-500" />
              <span>Patients: <strong className="font-mono text-blue-500">{stats.totalPatients}</strong></span>
            </div>
            <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              <span>Critical: <strong className="font-mono text-rose-500">{stats.criticalAlerts}</strong></span>
            </div>
            <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Triage: <strong className="font-mono text-amber-500">{stats.avgTriageMinutes}m avg</strong></span>
            </div>
          </div>

          {/* New Patient Button */}
          <button
            onClick={onAddNewItem}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>New Patient Intake</span>
          </button>

          {/* Export / Share */}
          <button
            title="Export Board Data"
            className={`p-2 rounded-xl border transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"}`}
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`p-2 rounded-xl border transition-colors ${isDarkMode ? "bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20" : "bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-900"}`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Board Views Bar & Controls */}
      <div className="px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 pb-3 overflow-x-auto">
        {/* View Switcher Tabs */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDarkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
          <button
            onClick={() => onViewChange("table")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === "table"
                ? "bg-blue-600 text-white shadow-sm"
                : isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50" : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Main Board</span>
          </button>

          <button
            onClick={() => onViewChange("kanban")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === "kanban"
                ? "bg-blue-600 text-white shadow-sm"
                : isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50" : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban Cards</span>
          </button>

          <button
            onClick={() => onViewChange("timeline")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === "timeline"
                ? "bg-blue-600 text-white shadow-sm"
                : isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50" : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Timeline / Shifts</span>
          </button>

          <button
            onClick={() => onViewChange("widgets")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === "widgets"
                ? "bg-blue-600 text-white shadow-sm"
                : isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50" : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Bento Widgets</span>
          </button>

          <button
            onClick={() => onViewChange("ai")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === "ai"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                : isDarkMode ? "text-purple-400 hover:text-purple-300 hover:bg-purple-950/30" : "text-purple-700 hover:text-purple-900 hover:bg-purple-50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 animate-spin-slow text-amber-300" />
            <span>AI Copilot</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className={`absolute left-3 top-2.5 h-3.5 w-3.5 ${isDarkMode ? "text-slate-400" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Search patients, doctors, diagnosis..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                isDarkMode
                  ? "bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
              }`}
            />
          </div>

          {/* Group Filter */}
          <div className="relative">
            <select
              value={selectedGroupFilter}
              onChange={(e) => onGroupFilterChange(e.target.value)}
              className={`pl-3 pr-8 py-1.5 rounded-xl border text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? "bg-slate-950/60 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <option value="all">All Groups</option>
              <option value="Emergency Triage">Emergency Triage</option>
              <option value="ICU & High Dependency">ICU & High Dependency</option>
              <option value="Outpatient & Telehealth">Outpatient & Telehealth</option>
              <option value="Discharge Pipeline">Discharge Pipeline</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 pointer-events-none text-slate-400" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={selectedPriorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value)}
              className={`pl-3 pr-8 py-1.5 rounded-xl border text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? "bg-slate-950/60 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <option value="all">All Priorities</option>
              <option value="Urgent !!!">Urgent !!!</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Routine">Routine</option>
            </select>
            <Filter className="absolute right-2.5 top-2.5 h-3.5 w-3.5 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
