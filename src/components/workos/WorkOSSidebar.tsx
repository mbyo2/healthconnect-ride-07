import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  Star,
  Search,
  Plus,
  Folder,
  Table,
  Kanban,
  BarChart2,
  Users,
  Settings,
  HelpCircle,
  Bell,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ChevronDown
} from "lucide-react";

interface WorkOSSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDarkMode: boolean;
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
}

export const WorkOSSidebar: React.FC<WorkOSSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isDarkMode,
  activeBoardId,
  onSelectBoard,
}) => {
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [searchBoardQuery, setSearchBoardQuery] = useState("");

  const boards = [
    { id: "main-triage", name: "Patient Triage & Operations", icon: Table, color: "text-[#0073ea]", count: 7, isFavorite: true },
    { id: "icu-pipeline", name: "ICU & Bed Allocation", icon: Layers, color: "text-[#a25ddc]", count: 4, isFavorite: true },
    { id: "telehealth-crm", name: "Outpatient Telehealth Queue", icon: Activity, color: "text-[#00c875]", count: 12, isFavorite: false },
    { id: "discharge-hub", name: "Discharge & Billing Pipeline", icon: BarChart2, color: "text-[#ff3d57]", count: 3, isFavorite: false },
    { id: "referral-leads", name: "Doctor Referrals & Leads", icon: Users, color: "text-[#fdab3d]", count: 9, isFavorite: false },
  ];

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchBoardQuery.toLowerCase())
  );

  return (
    <aside
      className={`relative flex flex-col h-full border-r transition-all duration-300 z-30 select-none ${
        isCollapsed ? "w-16" : "w-64"
      } ${
        isDarkMode
          ? "bg-slate-900/95 border-slate-800 text-slate-200"
          : "bg-[#292f4c] border-slate-800 text-white"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className={`absolute -right-3 top-6 z-40 h-6 w-6 rounded-full border shadow-md flex items-center justify-center transition-transform hover:scale-110 ${
          isDarkMode
            ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
        }`}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Monday Logo & Workspace Selector Header */}
      <div className="p-3.5 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Monday 3-Dots Iconic Logo Icon */}
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#0073ea] via-[#a25ddc] to-[#00c875] p-0.5 flex-shrink-0 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-slate-950/30 rounded-[10px] flex items-center justify-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d57]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#fdab3d]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c875]" />
            </div>
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-sm tracking-tight truncate">monday CRM</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded font-bold uppercase">
                  WORKOS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">Main Healthcare Hub</p>
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
          {/* Search Boards */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search boards & pipelines..."
              value={searchBoardQuery}
              onChange={(e) => setSearchBoardQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none transition-all ${
                isDarkMode
                  ? "bg-slate-950/60 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500"
                  : "bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-blue-400"
              }`}
            />
          </div>

          {/* Favorites Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              <span>Favorites</span>
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            </div>
            {boards
              .filter((b) => b.isFavorite)
              .map((board) => {
                const Icon = board.icon;
                const isActive = activeBoardId === board.id;

                return (
                  <button
                    key={board.id}
                    onClick={() => onSelectBoard(board.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#0073ea] text-white shadow-sm font-bold"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : board.color}`} />
                      <span className="truncate">{board.name}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {board.count}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Workspace Folders */}
          <div className="pt-2 space-y-1">
            <div
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 cursor-pointer hover:text-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-blue-400" />
                <span>Clinical Workspace</span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${workspaceOpen ? "" : "-rotate-90"}`} />
            </div>

            {workspaceOpen &&
              filteredBoards.map((board) => {
                const Icon = board.icon;
                const isActive = activeBoardId === board.id;

                return (
                  <button
                    key={board.id}
                    onClick={() => onSelectBoard(board.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#0073ea] text-white shadow-sm font-bold"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : board.color}`} />
                      <span className="truncate">{board.name}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {board.count}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Collapsed State Bar Icons */}
      {isCollapsed && (
        <div className="p-2 space-y-3 flex-1 flex flex-col items-center pt-4">
          {boards.map((board) => {
            const Icon = board.icon;
            const isActive = activeBoardId === board.id;

            return (
              <button
                key={board.id}
                onClick={() => onSelectBoard(board.id)}
                title={board.name}
                className={`p-2 rounded-xl transition-all ${
                  isActive
                    ? "bg-[#0073ea] text-white shadow-md"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Footer Settings & Automations Info */}
      <div className="p-3 border-t border-slate-700/60 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>3 Automations Active</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">
              ONLINE
            </span>
          </div>
        ) : (
          <span title="Automations Active"><Zap className="h-4 w-4 text-amber-400 mx-auto" /></span>
        )}
      </div>
    </aside>
  );
};
