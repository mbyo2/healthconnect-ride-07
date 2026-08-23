import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Search,
  Table,
  Kanban,
  Calendar,
  BarChart3,
  Sparkles,
  UserCheck,
  Stethoscope,
  Building2,
  Pill,
  Star,
  CheckCircle2,
  ArrowRight,
  Plus,
  Filter,
  ChevronDown,
  Activity,
  HeartPulse,
  Clock,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

export const LandingHero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"table" | "kanban" | "timeline" | "stats">("table");
  const stats = usePlatformStats();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
  };

  // Live Monday-Style Board Data on Landing Page
  const [patients] = useState([
    {
      id: "PAT-801",
      name: "Chanda Mulenga",
      ageGender: "42M",
      service: "Cardiology Consult",
      status: "Done",
      statusColor: "bg-[#00c875]",
      priority: "Urgent !!!",
      priorityBg: "bg-[#e2445c]",
      doctor: "Dr. Mutale Mwansa",
      doctorRole: "Chief Cardiology",
      location: "Lusaka ER-B1",
      vitalScore: "98% SpO2 • 120/80",
      progress: 100,
      cost: "ZMW K3,450",
      action: "View Summary",
      route: "/appointments",
    },
    {
      id: "PAT-802",
      name: "Thandiwe Banda",
      ageGender: "29F",
      service: "Emergency Malaria Screen",
      status: "In Progress",
      statusColor: "bg-[#fdab3d]",
      priority: "High",
      priorityBg: "bg-[#fdab3d]",
      doctor: "Dr. Sarah Jenkins",
      doctorRole: "Emergency Trauma",
      location: "Lusaka ER-B4",
      vitalScore: "95% SpO2 • 118/75",
      progress: 60,
      cost: "ZMW K1,850",
      action: "Track Triage",
      route: "/emergency",
    },
    {
      id: "PAT-803",
      name: "Kabwe Bwalya",
      ageGender: "58M",
      service: "Post-op ICU Monitoring",
      status: "Under Review",
      statusColor: "bg-[#a25ddc]",
      priority: "High",
      priorityBg: "bg-[#fdab3d]",
      doctor: "Dr. Chisamba Banda",
      doctorRole: "ICU Specialist",
      location: "UTH ICU Bed 3",
      vitalScore: "97% SpO2 • 122/80",
      progress: 75,
      cost: "ZMW K12,400",
      action: "Open EMR",
      route: "/medical-records",
    },
    {
      id: "PAT-804",
      name: "Grace Tembo",
      ageGender: "51F",
      service: "Hypertension Teleconsult",
      status: "Scheduled",
      statusColor: "bg-[#579bfc]",
      priority: "Routine",
      priorityBg: "bg-slate-500",
      doctor: "Dr. Elena Rostova",
      doctorRole: "General Medicine",
      location: "Ndola Telehub",
      vitalScore: "99% SpO2 • 128/82",
      progress: 30,
      cost: "ZMW K650",
      action: "Join Video",
      route: "/video-dashboard",
    },
  ]);

  return (
    <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white pt-28 pb-16 transition-colors overflow-hidden relative">
      {/* Dynamic Background Glow Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Hero Headline Banner */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          {/* Monday Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-extrabold text-blue-400 mb-6 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>✨ Voted #1 Healthcare WorkOS & CRM in Zambia</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] font-sans">
            The Healthcare CRM & WorkOS <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent">
              that teams actually love using.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed">
            Centralize patient intake, emergency triage, bed allocations, AI diagnostic copilots, and pharmacy fulfillment — all on one seamless, high-velocity WorkOS board.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
            <button
              onClick={() => navigate("/auth?tab=signup")}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#0073ea] via-indigo-600 to-[#a25ddc] hover:from-blue-600 hover:to-purple-600 text-white font-black text-sm sm:text-base shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => navigate("/workos")}
              className="px-7 py-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-extrabold text-sm sm:text-base shadow-lg transition-all hover:scale-105 flex items-center gap-2"
            >
              <Activity className="h-5 w-5 text-emerald-400" />
              <span>Explore Live WorkOS Board ⚡</span>
            </button>
          </div>

          {/* Search Form Bar */}
          <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto flex items-center gap-2 p-2 rounded-full bg-slate-900/90 border border-slate-700 shadow-2xl backdrop-blur-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors, specialties, clinics, or conditions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-3 py-2 text-xs sm:text-sm font-medium bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#0073ea] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              Search
            </button>
          </form>

          {/* Quick Specialty Filter Chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["General Practice", "Cardiology", "Pediatrics", "Dentistry", "Gynecology", "Emergency Triage"].map((spec) => (
              <button
                key={spec}
                onClick={() => navigate(`/search?specialty=${encodeURIComponent(spec)}`)}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:border-[#0073ea] hover:text-white transition-all shadow-xs"
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Monday.com CRM HD Browser Frame & Live Board Mockup */}
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/90 shadow-2xl shadow-blue-500/10 overflow-hidden backdrop-blur-xl">
          {/* Browser Window Bar */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-slate-400">monday.com/crm/workos-patient-board</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE DEMO</span>
            </div>
          </div>

          {/* Board Header Switcher Bar */}
          <div className="px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0073ea] via-[#a25ddc] to-[#00c875] p-0.5 flex items-center justify-center font-black text-xs text-white shadow-md">
                CRM
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                  Live National Patient & Clinical Queue
                </h2>
                <p className="text-[11px] text-slate-400">
                  Real-time board feed across Lusaka, Ndola & Kitwe medical centers
                </p>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  activeTab === "table"
                    ? "bg-[#0073ea] text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Main Table</span>
              </button>

              <button
                onClick={() => setActiveTab("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  activeTab === "kanban"
                    ? "bg-[#0073ea] text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Kanban Cards</span>
              </button>

              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  activeTab === "timeline"
                    ? "bg-[#0073ea] text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab("stats")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  activeTab === "stats"
                    ? "bg-[#0073ea] text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Telemetry</span>
              </button>
            </div>
          </div>

          {/* View Content 1: Main Table Board */}
          {activeTab === "table" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/80">
                    <th className="py-3 px-4 w-[240px]">Patient Record</th>
                    <th className="py-3 px-3 w-[150px] text-center">Status Pill</th>
                    <th className="py-3 px-3 w-[120px] text-center">Priority</th>
                    <th className="py-3 px-3 w-[170px]">Assigned Specialist</th>
                    <th className="py-3 px-3 w-[130px]">Bed / Unit</th>
                    <th className="py-3 px-3 w-[130px]">Vitals Telemetry</th>
                    <th className="py-3 px-3 w-[120px]">Billing (ZMW)</th>
                    <th className="py-3 px-3 w-[130px] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                      onClick={() => navigate(patient.route)}
                    >
                      {/* Patient Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                          <span>{patient.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({patient.ageGender})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {patient.service}
                        </div>
                      </td>

                      {/* Monday Pill-Shaped Status Indicator Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block w-full py-1.5 px-3 rounded-full text-xs font-bold text-white text-center shadow-md ${patient.statusColor}`}>
                          {patient.status}
                        </span>
                      </td>

                      {/* Priority Tag */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-extrabold text-white ${patient.priorityBg}`}>
                          {patient.priority}
                        </span>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-xs text-slate-200">{patient.doctor}</div>
                        <div className="text-[10px] text-slate-400">{patient.doctorRole}</div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-800 font-mono text-[11px] font-semibold text-slate-300 border border-slate-700">
                          {patient.location}
                        </span>
                      </td>

                      {/* Vitals */}
                      <td className="py-3.5 px-3 font-mono">
                        <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                          <HeartPulse className="h-3.5 w-3.5 animate-pulse" />
                          <span>{patient.vitalScore.split(' ')[0]}</span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                        {patient.cost}
                      </td>

                      {/* Direct Action Button */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(patient.route)}
                          className="px-3 py-1.5 rounded-lg bg-[#0073ea] hover:bg-blue-600 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 mx-auto"
                        >
                          <span>{patient.action}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Board Footer Summary with Status Battery Bar */}
              <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                <div className="flex items-center gap-4">
                  <span>Total Patient Queue: <strong>{patients.length} Active</strong></span>
                  <div className="hidden sm:flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00c875]" /> 1 Done
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fdab3d] ml-2" /> 1 In Progress
                    <span className="w-2.5 h-2.5 rounded-full bg-[#a25ddc] ml-2" /> 1 Review
                    <span className="w-2.5 h-2.5 rounded-full bg-[#579bfc] ml-2" /> 1 Scheduled
                  </div>
                </div>

                <button
                  onClick={() => navigate("/workos")}
                  className="text-[#0073ea] hover:text-blue-400 font-extrabold flex items-center gap-1"
                >
                  <span>Open Full WorkOS Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* View Content 2: Kanban Cards */}
          {activeTab === "kanban" && (
            <div className="p-4 bg-slate-950 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => navigate(patient.route)}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-[#0073ea] hover:shadow-xl transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{patient.id}</span>
                      <h4 className="font-extrabold text-sm text-slate-100">{patient.name}</h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold text-white ${patient.statusColor}`}>
                      {patient.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium">{patient.service}</p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">{patient.doctor}</span>
                    <span className="font-mono text-emerald-400">{patient.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View Content 3: Timeline */}
          {activeTab === "timeline" && (
            <div className="p-4 bg-slate-950 space-y-3">
              <div className="text-xs font-bold text-slate-300 mb-2">Today's Treatment Horizon</div>
              {patients.map((patient, idx) => (
                <div key={patient.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-mono text-xs font-bold text-[#0073ea] w-20">{patient.id}</span>
                  <span className="font-bold text-xs text-slate-100 w-36 truncate">{patient.name}</span>
                  <div className="flex-1 bg-slate-800 h-4 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full ${patient.statusColor}`}
                      style={{ width: `${(idx + 1) * 25}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-400 w-16 text-right">{(idx + 1) * 25}%</span>
                </div>
              ))}
            </div>
          )}

          {/* View Content 4: Telemetry Stats */}
          {activeTab === "stats" && (
            <div className="p-6 bg-slate-950 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">Verified Doctors</div>
                <div className="text-3xl font-black font-mono text-[#0073ea] mt-1">{formatStat(stats.doctors)}</div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-1">✓ NHIMA Accredited</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">Partner Hospitals</div>
                <div className="text-3xl font-black font-mono text-purple-400 mt-1">{formatStat(stats.hospitals)}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">24/7 ICU & ER</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">Pharmacies</div>
                <div className="text-3xl font-black font-mono text-amber-400 mt-1">{formatStat(stats.pharmacies)}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">Same-day Delivery</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">Average Rating</div>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">{stats.rating}★</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">98.4% Patient Approval</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
