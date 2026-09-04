import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { WorkOSBoardHeader, BoardViewMode } from "@/components/workos/WorkOSBoardHeader";
import { WorkOSTableBoard, PatientRecord, PatientStatus, PriorityLevel } from "@/components/workos/WorkOSTableBoard";
import { WorkOSKanbanBoard } from "@/components/workos/WorkOSKanbanBoard";
import { WorkOSTimelineView } from "@/components/workos/WorkOSTimelineView";
import { WorkOSWidgetsGrid } from "@/components/workos/WorkOSWidgetsGrid";
import { WorkOSAICopilotBar } from "@/components/workos/WorkOSAICopilotBar";
import { WorkOSSidebar } from "@/components/workos/WorkOSSidebar";
import { WorkOSFunnelView } from "@/components/workos/WorkOSFunnelView";
import { X, Plus, Sparkles, HeartPulse, User, MapPin, DollarSign, Activity, CheckCircle2, ShieldAlert, Zap, Layers, Check } from "lucide-react";

// Mock Data featuring realistic Zambian healthcare records
const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: "PAT-101",
    groupName: "Emergency Triage",
    name: "Chanda Mulenga",
    ageGender: "42M",
    symptoms: "Acute Chest Pain & Dyspnea",
    status: "Stuck / Critical",
    priority: "Urgent !!!",
    doctor: {
      name: "Dr. Mutale Mwansa",
      specialty: "Chief Cardiology",
      avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&auto=format&fit=crop&q=85",
    },
    location: "Lusaka ER-B1",
    vitalScore: "88% SpO2 • 145/95",
    timelineDays: 15,
    billingZMW: 3450,
    aiDiagnosticTag: "High STEMI Probability",
    dateAdded: "08:15 AM",
  },
  {
    id: "PAT-102",
    groupName: "Emergency Triage",
    name: "Thandiwe Banda",
    ageGender: "29F",
    symptoms: "High Fever & Severe Rigors",
    status: "In Progress",
    priority: "High",
    doctor: {
      name: "Dr. Sarah Jenkins",
      specialty: "Emergency Trauma",
      avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&auto=format&fit=crop&q=85",
    },
    location: "Lusaka ER-B4",
    vitalScore: "95% SpO2 • 118/75",
    timelineDays: 40,
    billingZMW: 1850,
    aiDiagnosticTag: "Malaria Rapid (+) Confirmed",
    dateAdded: "09:05 AM",
  },
  {
    id: "PAT-103",
    groupName: "ICU & High Dependency",
    name: "Kabwe Bwalya",
    ageGender: "58M",
    symptoms: "Post-op Coronary Bypass Monitoring",
    status: "Under Review",
    priority: "High",
    doctor: {
      name: "Dr. Mutale Mwansa",
      specialty: "Chief Cardiology",
      avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&auto=format&fit=crop&q=85",
    },
    location: "UTH ICU Bed 3",
    vitalScore: "97% SpO2 • 122/80",
    timelineDays: 75,
    billingZMW: 12400,
    aiDiagnosticTag: "Hemodynamic Stabilization",
    dateAdded: "Yesterday",
  },
  {
    id: "PAT-104",
    groupName: "ICU & High Dependency",
    name: "Nalikena Phiri",
    ageGender: "34F",
    symptoms: "Severe Respiratory Distress (ARDS)",
    status: "Stuck / Critical",
    priority: "Urgent !!!",
    doctor: {
      name: "Dr. Chisamba Banda",
      specialty: "Neurology & ICU",
      avatarUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=100&auto=format&fit=crop&q=85",
    },
    location: "UTH ICU Bed 7",
    vitalScore: "89% SpO2 • 138/90",
    timelineDays: 85,
    billingZMW: 18900,
    aiDiagnosticTag: "Ventilator Assist Rec.",
    dateAdded: "Aug 21",
  },
  {
    id: "PAT-105",
    groupName: "Outpatient & Telehealth",
    name: "Grace Tembo",
    ageGender: "51F",
    symptoms: "Hypertension Routine Follow-up",
    status: "Scheduled",
    priority: "Routine",
    doctor: {
      name: "Dr. Elena Rostova",
      specialty: "General Medicine",
      avatarUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&auto=format&fit=crop&q=85",
    },
    location: "Ndola Telehub",
    vitalScore: "98% SpO2 • 130/85",
    timelineDays: 20,
    billingZMW: 650,
    aiDiagnosticTag: "BP Meds Titration",
    dateAdded: "10:30 AM",
  },
  {
    id: "PAT-106",
    groupName: "Outpatient & Telehealth",
    name: "Mwamba Kasonde",
    ageGender: "23M",
    symptoms: "Dermatological Rash & Allergy",
    status: "In Progress",
    priority: "Medium",
    doctor: {
      name: "Dr. Elena Rostova",
      specialty: "General Medicine",
      avatarUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&auto=format&fit=crop&q=85",
    },
    location: "Kitwe Clinic",
    vitalScore: "99% SpO2 • 115/70",
    timelineDays: 50,
    billingZMW: 920,
    aiDiagnosticTag: "Antihistamine Prescribed",
    dateAdded: "11:00 AM",
  },
  {
    id: "PAT-107",
    groupName: "Discharge Pipeline",
    name: "Mapalo Zimba",
    ageGender: "65M",
    symptoms: "Recovered Pneumonia - Final Clearance",
    status: "Done",
    priority: "Routine",
    doctor: {
      name: "Dr. Sarah Jenkins",
      specialty: "Emergency Trauma",
      avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&auto=format&fit=crop&q=85",
    },
    location: "Ward 4B Bed 12",
    vitalScore: "98% SpO2 • 120/78",
    timelineDays: 100,
    billingZMW: 4200,
    aiDiagnosticTag: "Cleared for Discharge",
    dateAdded: "Aug 19",
  },
];

export const BespokeWorkOSShowcase = () => {
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);
  const [currentView, setCurrentView] = useState<BoardViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("all");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetAddGroup, setTargetAddGroup] = useState("Emergency Triage");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Monday Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeBoardId, setActiveBoardId] = useState("main-triage");

  // Monday Automations & Integrations Modals
  const [isAutomationsModalOpen, setIsAutomationsModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);

  // New Patient Form State
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("30M");
  const [newPatientSymptoms, setNewPatientSymptoms] = useState("");
  const [newPatientStatus, setNewPatientStatus] = useState<PatientStatus>("In Progress");
  const [newPatientPriority, setNewPatientPriority] = useState<PriorityLevel>("High");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStatusChange = (id: string, newStatus: PatientStatus) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    showToast(`Patient ${id} status updated to ${newStatus}`);
  };

  const handlePriorityChange = (id: string, newPriority: PriorityLevel) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, priority: newPriority } : p))
    );
    showToast(`Patient ${id} priority set to ${newPriority}`);
  };

  const handleAddNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName) return;

    const newRecord: PatientRecord = {
      id: `PAT-${Math.floor(100 + Math.random() * 900)}`,
      groupName: targetAddGroup,
      name: newPatientName,
      ageGender: newPatientAge,
      symptoms: newPatientSymptoms || "Clinical observation requested",
      status: newPatientStatus,
      priority: newPatientPriority,
      doctor: {
        name: "Dr. Sarah Jenkins",
        specialty: "Emergency Trauma",
        avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&auto=format&fit=crop&q=85",
      },
      location: "Lusaka Triage-New",
      vitalScore: "96% SpO2 • 120/80",
      timelineDays: 10,
      billingZMW: 1200,
      aiDiagnosticTag: "Triage Intake Logged",
      dateAdded: "Just Now",
    };

    setPatients((prev) => [newRecord, ...prev]);
    setIsAddModalOpen(false);
    setNewPatientName("");
    setNewPatientSymptoms("");
    showToast(`New patient ${newRecord.name} added to ${targetAddGroup}`);
  };

  // Filter patients based on search & drop downs
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.symptoms.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGroup = selectedGroupFilter === "all" || p.groupName === selectedGroupFilter;
    return matchesSearch && matchesGroup;
  });

  const stats = {
    totalPatients: patients.length,
    criticalAlerts: patients.filter((p) => p.status === "Stuck / Critical" || p.priority === "Urgent !!!").length,
    avgTriageMinutes: 12,
    icuOccupancyPercent: 90,
  };

  const BOARD_METADATA: Record<string, { title: string; subtitle: string }> = {
    "main-triage": {
      title: "Patient Triage & Operations",
      subtitle: "High-velocity clinical queue, bed allocation & multi-modal AI dispatch",
    },
    "insurance-claims": {
      title: "NHIMA Insurance & Claims Engine",
      subtitle: "Instant policy verification, automated ICD-10 coding & batch submission",
    },
    "accounting-ledger": {
      title: "Hospital Accounting & Doctor Splits",
      subtitle: "General ledger, 16% VAT invoices, doctor revenue splits & payment settlements",
    },
    "hrms-roster": {
      title: "HRMS Staff Roster & HPCZ Credentialing",
      subtitle: "Doctor & nurse shift planning, attendance tracking & HPCZ license renewals",
    },
    "icu-pipeline": {
      title: "ICU & Bed Allocation Hub",
      subtitle: "Real-time occupancy monitoring and critical care dispatch",
    },
    "telehealth-crm": {
      title: "Outpatient Telehealth Queue",
      subtitle: "Encrypted HD teleconsultations and digital prescription routing",
    },
    "discharge-hub": {
      title: "Discharge & Billing Pipeline",
      subtitle: "Patient exit clearance, pharmacy fulfillment and payment confirmation",
    },
  };

  const currentBoardInfo = BOARD_METADATA[activeBoardId] || {
    title: "Clinical WorkOS Workspace",
    subtitle: "Unified healthcare operations CRM",
  };

  return (
    <>
      <Helmet>
        <title>Clinical WorkOS Board | Doc' O Clock</title>
        <meta name="description" content="Doc' O Clock bespoke clinical operations dashboard for emergency triage, bed allocations, and AI telehealth." />
      </Helmet>

      <div className={`min-h-screen flex font-sans transition-colors duration-200 ${
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6f8] text-slate-900"
      }`}>
        {/* WorkOS Workspace Navigation Sidebar */}
        <WorkOSSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isDarkMode={isDarkMode}
          activeBoardId={activeBoardId}
          onSelectBoard={(id) => {
            setActiveBoardId(id);
            showToast(`Switched to board: ${id}`);
          }}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Board Header Bar */}
          <WorkOSBoardHeader
            currentView={currentView}
            onViewChange={setCurrentView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGroupFilter={selectedGroupFilter}
            onGroupFilterChange={setSelectedGroupFilter}
            selectedPriorityFilter={selectedPriorityFilter}
            onPriorityFilterChange={setSelectedPriorityFilter}
            onAddNewItem={() => {
              setTargetAddGroup("Emergency Triage");
              setIsAddModalOpen(true);
            }}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            stats={stats}
            onOpenAutomationsModal={() => setIsAutomationsModalOpen(true)}
            onOpenIntegrationsModal={() => setIsIntegrationsModalOpen(true)}
            boardTitle={currentBoardInfo.title}
            boardSubtitle={currentBoardInfo.subtitle}
          />

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-blue-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-bold font-mono">{toastMessage}</span>
            </div>
          )}

          {/* Main Board View Container */}
          <main className="flex-1 w-full overflow-hidden">
            {currentView === "table" && (
              <WorkOSTableBoard
                patients={filteredPatients}
                isDarkMode={isDarkMode}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onSelectPatient={setSelectedPatient}
                onAddNewPatientInGroup={(grp) => {
                  setTargetAddGroup(grp);
                  setIsAddModalOpen(true);
                }}
              />
            )}

            {currentView === "kanban" && (
              <WorkOSKanbanBoard
                patients={filteredPatients}
                isDarkMode={isDarkMode}
                onStatusChange={handleStatusChange}
                onSelectPatient={setSelectedPatient}
                onAddNewItem={() => {
                  setTargetAddGroup("Emergency Triage");
                  setIsAddModalOpen(true);
                }}
              />
            )}

            {currentView === "timeline" && (
              <WorkOSTimelineView
                patients={filteredPatients}
                isDarkMode={isDarkMode}
                onSelectPatient={setSelectedPatient}
              />
            )}

            {currentView === "funnel" && (
              <WorkOSFunnelView
                patients={filteredPatients}
                isDarkMode={isDarkMode}
                onSelectPatient={setSelectedPatient}
              />
            )}

            {currentView === "widgets" && (
              <WorkOSWidgetsGrid isDarkMode={isDarkMode} stats={stats} />
            )}

            {currentView === "ai" && (
              <WorkOSAICopilotBar
                isDarkMode={isDarkMode}
                onExecutePrompt={(prompt) => showToast(`Executed AI Command: ${prompt}`)}
              />
            )}
          </main>
        </div>

        {/* Modal: Clinical Automations Center */}
        {isAutomationsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 ${
              isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-amber-500">
                  <Zap className="h-5 w-5" />
                  <h3 className="font-extrabold text-lg">Clinical Automations Center</h3>
                </div>
                <button
                  onClick={() => setIsAutomationsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div>
                    <div className="font-bold text-xs">When <span className="text-rose-500">Status changes to Stuck / Critical</span></div>
                    <div className="text-[11px] text-slate-400">Send instant SMS alert to On-Call Chief Doctor & page ICU staff</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">ACTIVE</span>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div>
                    <div className="font-bold text-xs">When <span className="text-blue-500">Patient intake completes</span></div>
                    <div className="text-[11px] text-slate-400">Trigger MedGemma AI diagnostic triage classification & assign bed</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">ACTIVE</span>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div>
                    <div className="font-bold text-xs">When <span className="text-[#00c875]">Status changes to Done</span></div>
                    <div className="text-[11px] text-slate-400">Move patient item to Discharge Pipeline & generate PDF invoice</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">ACTIVE</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsAutomationsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Clinical Integrations Center */}
        {isIntegrationsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 ${
              isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Layers className="h-5 w-5" />
                  <h3 className="font-extrabold text-lg">Clinical Integrations Hub</h3>
                </div>
                <button
                  onClick={() => setIsIntegrationsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {["Supabase Realtime Sync", "Twilio WhatsApp & SMS", "DPO & PayPal Payments", "HuggingFace MedGemma AI", "Zapier Webhooks"].map((app, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-xs font-bold">{app}</span>
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsIntegrationsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: New Patient Intake */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 ${
              isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-500" />
                  <h3 className="font-extrabold text-lg">New Patient Intake ({targetAddGroup})</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddNewPatient} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chileshe Lungu"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Age / Gender</label>
                    <input
                      type="text"
                      placeholder="e.g. 35F"
                      value={newPatientAge}
                      onChange={(e) => setNewPatientAge(e.target.value)}
                      className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Initial Priority</label>
                    <select
                      value={newPatientPriority}
                      onChange={(e) => setNewPatientPriority(e.target.value as PriorityLevel)}
                      className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <option value="Urgent !!!">Urgent !!!</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Routine">Routine</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Chief Symptoms / Complaint</label>
                  <textarea
                    rows={2}
                    placeholder="Describe symptoms or ER notes..."
                    value={newPatientSymptoms}
                    onChange={(e) => setNewPatientSymptoms(e.target.value)}
                    className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
                  >
                    Add to Board
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Patient Detail Drawer */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-end">
            <div className={`w-full max-w-xl h-full border-l p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right-8 ${
              isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                    {selectedPatient.id}
                  </span>
                  <h3 className="font-extrabold text-xl">{selectedPatient.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {/* Status & Priority Strip */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Status</span>
                    <div className="mt-1 text-sm font-bold text-blue-500">{selectedPatient.status}</div>
                  </div>

                  <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Triage Priority</span>
                    <div className="mt-1 text-sm font-bold text-amber-500">{selectedPatient.priority}</div>
                  </div>
                </div>

                {/* Vitals Telemetry */}
                <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                    <HeartPulse className="h-4 w-4 animate-pulse" />
                    <span>Real-Time Vitals Telemetry</span>
                  </div>
                  <div className="mt-2 text-lg font-mono font-bold">{selectedPatient.vitalScore}</div>
                  <div className="mt-1 text-xs text-slate-400">Location: {selectedPatient.location}</div>
                </div>

                {/* Assigned Clinical Lead */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <img
                    src={selectedPatient.doctor.avatarUrl}
                    alt={selectedPatient.doctor.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-blue-500"
                  />
                  <div>
                    <div className="font-extrabold text-base">{selectedPatient.doctor.name}</div>
                    <div className="text-xs text-slate-400">{selectedPatient.doctor.specialty}</div>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span>MedGemma AI Clinical Assessment</span>
                  </div>
                  <p className="text-xs font-mono">{selectedPatient.aiDiagnosticTag}</p>
                </div>

                {/* Billing Summary */}
                <div className="flex justify-between items-center p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400">Total Billing (ZMW):</span>
                  <span className="text-lg font-mono font-bold text-emerald-500">ZMW K{selectedPatient.billingZMW.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BespokeWorkOSShowcase;
