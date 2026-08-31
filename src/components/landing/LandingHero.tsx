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
  ExternalLink,
  Zap,
  SlidersHorizontal,
  Layers,
  Check,
  AlertTriangle,
  FileText,
  DollarSign,
  Users,
  Shield,
  CreditCard,
  UserPlus,
  Briefcase,
  TrendingUp
} from "lucide-react";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

/* ─── Board Types & Data Models ─── */
type BoardDomain = "triage" | "insurance" | "accounting" | "hrms";

interface PatientRecord {
  id: string;
  name: string;
  ageGender: string;
  service: string;
  status: "Done" | "In Progress" | "Stuck / Critical" | "Under Review" | "Scheduled";
  statusColor: string;
  priority: "Urgent !!!" | "High" | "Medium" | "Routine";
  priorityBg: string;
  doctor: string;
  doctorRole: string;
  location: string;
  vitalScore: string;
  cost: string;
  action: string;
  route: string;
}

interface InsuranceClaimRecord {
  id: string;
  patientName: string;
  nhimaNumber: string;
  insurer: "NHIMA Zambia" | "Cigna Global" | "Prudential Life" | "Madison General" | "Medscheme";
  insurerColor: string;
  icdCode: string;
  claimAmount: string;
  status: "Approved" | "Pre-Authorized" | "In Adjudication" | "Disputed" | "Paid Out";
  statusColor: string;
  priority: "Urgent" | "Standard" | "Review";
  priorityBg: string;
  hospital: string;
  payoutDate: string;
}

interface AccountingRecord {
  id: string;
  invoiceTo: string;
  category: "Consultation" | "Surgery & ICU" | "Pharmacy Dispense" | "Lab Diagnostics";
  amount: string;
  doctorShare: string;
  taxVat: string;
  status: "Settled" | "Pending Payout" | "Overdue" | "Processing";
  statusColor: string;
  paymentMethod: "NHIMA Pre-Paid" | "DPO / Mobile Money" | "Credit Card" | "Direct Bank";
  dueDate: string;
}

interface HRStaffRecord {
  id: string;
  staffName: string;
  role: string;
  specialty: string;
  hpczNumber: string;
  shift: "Day Shift (08:00-16:00)" | "Night Shift (20:00-08:00)" | "On-Call Trauma" | "Leave / Off";
  status: "On Duty" | "On Call" | "Off Shift" | "Leave Approved";
  statusColor: string;
  hoursLogged: string;
  compliance: "100% Certified" | "Renewal Due" | "Audit Passed";
  complianceBg: string;
}

/* ─── Initial Mock Records ─── */
const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: "PAT-801",
    name: "Chanda Mulenga",
    ageGender: "42M",
    service: "Cardiology & STEMI Consult",
    status: "Done",
    statusColor: "bg-[#00c875]",
    priority: "Urgent !!!",
    priorityBg: "bg-[#e2445c]",
    doctor: "Dr. Mutale Mwansa",
    doctorRole: "Chief Cardiology",
    location: "Lusaka ER-B1",
    vitalScore: "98% SpO2 • 120/80",
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
    priorityBg: "bg-slate-600",
    doctor: "Dr. Elena Rostova",
    doctorRole: "General Medicine",
    location: "Ndola Telehub",
    vitalScore: "99% SpO2 • 128/82",
    cost: "ZMW K650",
    action: "Join Video",
    route: "/video-dashboard",
  },
  {
    id: "PAT-805",
    name: "Musonda Phiri",
    ageGender: "35F",
    service: "Pediatric Wellness Check",
    status: "Stuck / Critical",
    statusColor: "bg-[#e2445c]",
    priority: "Urgent !!!",
    priorityBg: "bg-[#e2445c]",
    doctor: "Dr. Brian Mwape",
    doctorRole: "Pediatrician",
    location: "Kitwe Ward 2",
    vitalScore: "94% SpO2 • 105/68",
    cost: "ZMW K950",
    action: "Urgent Review",
    route: "/emergency",
  },
];

const INITIAL_CLAIMS: InsuranceClaimRecord[] = [
  {
    id: "CLM-901",
    patientName: "Chanda Mulenga",
    nhimaNumber: "NHM-8829104",
    insurer: "NHIMA Zambia",
    insurerColor: "bg-emerald-600",
    icdCode: "I21.9 (Acute STEMI)",
    claimAmount: "ZMW K3,450",
    status: "Approved",
    statusColor: "bg-[#00c875]",
    priority: "Urgent",
    priorityBg: "bg-[#e2445c]",
    hospital: "Lusaka Apex Hospital",
    payoutDate: "Tomorrow",
  },
  {
    id: "CLM-902",
    patientName: "Kabwe Bwalya",
    nhimaNumber: "NHM-1928374",
    insurer: "Prudential Life",
    insurerColor: "bg-blue-600",
    icdCode: "Z95.1 (Coronary Bypass)",
    claimAmount: "ZMW K12,400",
    status: "In Adjudication",
    statusColor: "bg-[#a25ddc]",
    priority: "Standard",
    priorityBg: "bg-[#579bfc]",
    hospital: "UTH Lusaka",
    payoutDate: "3 Days",
  },
  {
    id: "CLM-903",
    patientName: "Thandiwe Banda",
    nhimaNumber: "NHM-7748291",
    insurer: "NHIMA Zambia",
    insurerColor: "bg-emerald-600",
    icdCode: "B50.9 (Falciparum Malaria)",
    claimAmount: "ZMW K1,850",
    status: "Pre-Authorized",
    statusColor: "bg-[#579bfc]",
    priority: "Standard",
    priorityBg: "bg-[#579bfc]",
    hospital: "CIMA Health Clinic",
    payoutDate: "5 Days",
  },
  {
    id: "CLM-904",
    patientName: "Mwamba Kasonde",
    nhimaNumber: "CIG-3829102",
    insurer: "Cigna Global",
    insurerColor: "bg-indigo-600",
    icdCode: "L20.9 (Atopic Dermatitis)",
    claimAmount: "ZMW K920",
    status: "Paid Out",
    statusColor: "bg-[#00c875]",
    priority: "Standard",
    priorityBg: "bg-slate-600",
    hospital: "Ndola Care Hub",
    payoutDate: "Settled Today",
  },
];

const INITIAL_ACCOUNTING: AccountingRecord[] = [
  {
    id: "INV-4401",
    invoiceTo: "University Teaching Hospital (UTH)",
    category: "Surgery & ICU",
    amount: "ZMW K34,800",
    doctorShare: "ZMW K24,360 (70%)",
    taxVat: "ZMW K5,568 (16%)",
    status: "Settled",
    statusColor: "bg-[#00c875]",
    paymentMethod: "NHIMA Pre-Paid",
    dueDate: "Paid Aug 30",
  },
  {
    id: "INV-4402",
    invoiceTo: "Lusaka Apex Medical Network",
    category: "Consultation",
    amount: "ZMW K8,450",
    doctorShare: "ZMW K6,760 (80%)",
    taxVat: "ZMW K1,352 (16%)",
    status: "Processing",
    statusColor: "bg-[#fdab3d]",
    paymentMethod: "DPO / Mobile Money",
    dueDate: "Due in 2 days",
  },
  {
    id: "INV-4403",
    invoiceTo: "Kitwe Central Hospital",
    category: "Pharmacy Dispense",
    amount: "ZMW K14,200",
    doctorShare: "ZMW K11,360",
    taxVat: "ZMW K2,272",
    status: "Pending Payout",
    statusColor: "bg-[#579bfc]",
    paymentMethod: "Direct Bank",
    dueDate: "Due Sep 05",
  },
  {
    id: "INV-4404",
    invoiceTo: "CIMA Telehealth Services",
    category: "Lab Diagnostics",
    amount: "ZMW K4,650",
    doctorShare: "ZMW K3,720",
    taxVat: "ZMW K744",
    status: "Settled",
    statusColor: "bg-[#00c875]",
    paymentMethod: "Credit Card",
    dueDate: "Paid Aug 29",
  },
];

const INITIAL_HRMS: HRStaffRecord[] = [
  {
    id: "EMP-101",
    staffName: "Dr. Mutale Mwansa",
    role: "Chief Cardiologist & Surgeon",
    specialty: "Cardiology & Trauma",
    hpczNumber: "HPCZ-MED-2014-9921",
    shift: "Day Shift (08:00-16:00)",
    status: "On Duty",
    statusColor: "bg-[#00c875]",
    hoursLogged: "38.5 hrs / wk",
    compliance: "100% Certified",
    complianceBg: "bg-emerald-500/20 text-emerald-300",
  },
  {
    id: "EMP-102",
    staffName: "Dr. Sarah Jenkins",
    role: "Senior Emergency Physician",
    specialty: "Trauma & Critical Care",
    hpczNumber: "HPCZ-MED-2018-4412",
    shift: "On-Call Trauma",
    status: "On Call",
    statusColor: "bg-[#fdab3d]",
    hoursLogged: "42.0 hrs / wk",
    compliance: "Audit Passed",
    complianceBg: "bg-blue-500/20 text-blue-300",
  },
  {
    id: "EMP-103",
    staffName: "Sr. Nurse Beatrice Phiri",
    role: "Head Triage Nurse",
    specialty: "Emergency Triage",
    hpczNumber: "HPCZ-NUR-2016-1029",
    shift: "Night Shift (20:00-08:00)",
    status: "On Duty",
    statusColor: "bg-[#00c875]",
    hoursLogged: "36.0 hrs / wk",
    compliance: "100% Certified",
    complianceBg: "bg-emerald-500/20 text-emerald-300",
  },
  {
    id: "EMP-104",
    staffName: "Dr. Chisamba Banda",
    role: "ICU Specialist Consultant",
    specialty: "Critical Care & Pulmonology",
    hpczNumber: "HPCZ-MED-2011-8840",
    shift: "Day Shift (08:00-16:00)",
    status: "Leave Approved",
    statusColor: "bg-[#579bfc]",
    hoursLogged: "12.0 hrs / wk",
    compliance: "Renewal Due",
    complianceBg: "bg-amber-500/20 text-amber-300",
  },
];

export const LandingHero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBoardDomain, setActiveBoardDomain] = useState<BoardDomain>("triage");
  const [activeTab, setActiveTab] = useState<"table" | "kanban" | "timeline" | "stats" | "automations">("table");

  // Domain states
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);
  const [claims, setClaims] = useState<InsuranceClaimRecord[]>(INITIAL_CLAIMS);
  const [accounting, setAccounting] = useState<AccountingRecord[]>(INITIAL_ACCOUNTING);
  const [hrms, setHrms] = useState<HRStaffRecord[]>(INITIAL_HRMS);

  const [tableSearch, setTableSearch] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const stats = usePlatformStats();

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
  };

  // Cycle status pill for Monday interactivity
  const cyclePatientStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const STATUS_CYCLE = [
      { label: "Done", color: "bg-[#00c875]" },
      { label: "In Progress", color: "bg-[#fdab3d]" },
      { label: "Under Review", color: "bg-[#a25ddc]" },
      { label: "Scheduled", color: "bg-[#579bfc]" },
      { label: "Stuck / Critical", color: "bg-[#e2445c]" },
    ] as const;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const currIdx = STATUS_CYCLE.findIndex((opt) => opt.label === p.status);
        const next = STATUS_CYCLE[(currIdx + 1) % STATUS_CYCLE.length];
        return { ...p, status: next.label, statusColor: next.color };
      })
    );
  };

  const cycleClaimStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const CLAIM_CYCLE = [
      { label: "Approved", color: "bg-[#00c875]" },
      { label: "In Adjudication", color: "bg-[#a25ddc]" },
      { label: "Pre-Authorized", color: "bg-[#579bfc]" },
      { label: "Disputed", color: "bg-[#e2445c]" },
      { label: "Paid Out", color: "bg-[#00c875]" },
    ] as const;

    setClaims((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const currIdx = CLAIM_CYCLE.findIndex((opt) => opt.label === c.status);
        const next = CLAIM_CYCLE[(currIdx + 1) % CLAIM_CYCLE.length];
        return { ...c, status: next.label, statusColor: next.color };
      })
    );
  };

  const handleAddPatientRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (activeBoardDomain === "triage") {
      const newRecord: PatientRecord = {
        id: `PAT-${800 + patients.length + 1}`,
        name: newItemName.trim(),
        ageGender: "32M",
        service: "Urgent Outpatient Triage",
        status: "In Progress",
        statusColor: "bg-[#fdab3d]",
        priority: "High",
        priorityBg: "bg-[#fdab3d]",
        doctor: "Dr. Sarah Jenkins",
        doctorRole: "Triage Attending",
        location: "ER Intake Unit",
        vitalScore: "98% SpO2 • 120/80",
        cost: "ZMW K1,200",
        action: "Track Triage",
        route: "/emergency",
      };
      setPatients([newRecord, ...patients]);
    } else if (activeBoardDomain === "insurance") {
      const newClaim: InsuranceClaimRecord = {
        id: `CLM-${900 + claims.length + 1}`,
        patientName: newItemName.trim(),
        nhimaNumber: `NHM-${Math.floor(1000000 + Math.random() * 9000000)}`,
        insurer: "NHIMA Zambia",
        insurerColor: "bg-emerald-600",
        icdCode: "Z00.0 (General Medical)",
        claimAmount: "ZMW K1,650",
        status: "Pre-Authorized",
        statusColor: "bg-[#579bfc]",
        priority: "Standard",
        priorityBg: "bg-[#579bfc]",
        hospital: "Lusaka Medical Hub",
        payoutDate: "3 Days",
      };
      setClaims([newClaim, ...claims]);
    }

    setNewItemName("");
    setIsAddingItem(false);
  };

  return (
    <section className="bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-indigo-950 text-white pt-28 pb-20 transition-colors overflow-hidden relative">
      {/* Background Glow Blobs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[520px] bg-gradient-to-tr from-blue-600/25 via-indigo-500/20 to-purple-600/25 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-96 -left-32 w-72 h-72 bg-emerald-500/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-96 -right-32 w-72 h-72 bg-rose-500/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1550px] px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Hero Headline Banner */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          {/* Monday Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-black text-blue-400 mb-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 hover:border-blue-500/50 transition-all">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>✨ Voted #1 Healthcare WorkOS, CRM, Claims & HRMS in Zambia</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] font-sans">
            The Complete Healthcare WorkOS <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-[#a25ddc] bg-clip-text text-transparent">
              for Clinical Triage, Claims, Accounting & HRMS.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed">
            Unify patient intake, NHIMA insurance claims, automated financial accounting, staff rostering, and MedGemma AI copilots on fully customizable Monday-style boards.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
            <button
              onClick={() => navigate("/auth?tab=signup")}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#0073ea] via-indigo-600 to-[#a25ddc] hover:from-blue-600 hover:to-purple-600 text-white font-black text-sm sm:text-base shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => navigate("/workos")}
              className="px-7 py-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-slate-200 font-extrabold text-sm sm:text-base shadow-xl transition-all hover:scale-105 flex items-center gap-2.5"
            >
              <Activity className="h-5 w-5 text-emerald-400" />
              <span>Explore Live WorkOS Workspace ⚡</span>
            </button>
          </div>

          {/* Search Form Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="mt-9 max-w-2xl mx-auto flex items-center gap-2 p-2 rounded-full bg-slate-900/95 border border-slate-700 shadow-2xl shadow-blue-900/10 backdrop-blur-2xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors, NHIMA claims, clinical tariffs, or hospitals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-3 py-2 text-xs sm:text-sm font-medium bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#0073ea] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Search</span>
            </button>
          </form>

          {/* Quick Specialty Filter Chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              "General Practice",
              "Cardiology",
              "NHIMA Claims",
              "Accounting Ledger",
              "Staff HRMS Roster",
              "Emergency Triage",
            ].map((spec) => (
              <button
                key={spec}
                onClick={() => navigate(`/search?specialty=${encodeURIComponent(spec)}`)}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:border-[#0073ea] hover:text-white hover:bg-slate-800 transition-all shadow-xs"
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Board Template Domain Switcher ─── */}
        <div className="mb-4 flex flex-wrap justify-center items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider mr-2 hidden sm:inline">
            Interactive WorkOS Boards:
          </span>
          {[
            { id: "triage", label: "🩺 Patient Intake & Triage", color: "border-blue-500" },
            { id: "insurance", label: "📑 Insurance & NHIMA Claims", color: "border-emerald-500" },
            { id: "accounting", label: "💰 Accounting & Billing Ledger", color: "border-amber-500" },
            { id: "hrms", label: "👥 HRMS & Staff Roster", color: "border-purple-500" },
          ].map((domain) => (
            <button
              key={domain.id}
              onClick={() => {
                setActiveBoardDomain(domain.id as BoardDomain);
                setActiveTab("table");
              }}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${
                activeBoardDomain === domain.id
                  ? `bg-slate-900 text-white ${domain.color} shadow-lg ring-2 ring-blue-500/30`
                  : "bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
              }`}
            >
              {domain.label}
            </button>
          ))}
        </div>

        {/* ─── Doc' O Clock Clinical WorkOS HD Browser Frame ─── */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-blue-900/20 overflow-hidden backdrop-blur-2xl">
          {/* Browser Window Bar */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#ff3d57]" />
              <span className="w-3 h-3 rounded-full bg-[#fdab3d]" />
              <span className="w-3 h-3 rounded-full bg-[#00c875]" />
              <div className="hidden sm:flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 ml-2">
                <span className="font-mono text-[11px] text-slate-300">
                  doc0clock.online/workos/{activeBoardDomain}-board
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[11px]">
                <Sparkles className="h-3 w-3 text-blue-400" />
                MedGemma AI Active
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE CRM DEMO</span>
              </div>
            </div>
          </div>

          {/* Board Header & View Switcher Bar */}
          <div className="px-4 py-3.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#0073ea] via-[#a25ddc] to-[#00c875] p-0.5 flex items-center justify-center font-black text-xs text-white shadow-lg">
                CRM
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                  <span>
                    {activeBoardDomain === "triage" && "Patient Intake & Emergency Triage Board"}
                    {activeBoardDomain === "insurance" && "National NHIMA Claims & Pre-Authorization Engine"}
                    {activeBoardDomain === "accounting" && "Hospital Accounting & Doctor Revenue Share Ledger"}
                    {activeBoardDomain === "hrms" && "Clinical Staffing, HPCZ Licenses & Shift Roster"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#0073ea] text-white">
                    {activeBoardDomain === "triage" && `${patients.length} Patients`}
                    {activeBoardDomain === "insurance" && `${claims.length} Claims`}
                    {activeBoardDomain === "accounting" && `${accounting.length} Invoices`}
                    {activeBoardDomain === "hrms" && `${hrms.length} Staff`}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {activeBoardDomain === "triage" && "Real-time clinical queue synchronized across Lusaka, Ndola & Kitwe medical centers"}
                  {activeBoardDomain === "insurance" && "Instant NHIMA eligibility checks, ICD-10 automated coding & claim batching"}
                  {activeBoardDomain === "accounting" && "General ledger, VAT receipts, mobile money gateway settlements & payouts"}
                  {activeBoardDomain === "hrms" && "Doctor & nurse duty rosters, HPCZ regulatory compliance & payroll tiers"}
                </p>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === "stats"
                    ? "bg-[#0073ea] text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Telemetry</span>
              </button>

              <button
                onClick={() => setActiveTab("automations")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === "automations"
                    ? "bg-[#0073ea] text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Automations</span>
              </button>
            </div>
          </div>

          {/* Interactive Toolbar for Table View */}
          {activeTab === "table" && (
            <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddingItem(!isAddingItem)}
                  className="px-3 py-1.5 rounded-lg bg-[#0073ea] hover:bg-blue-600 text-white font-extrabold flex items-center gap-1 shadow-md transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>
                    {activeBoardDomain === "triage" && "+ New Patient"}
                    {activeBoardDomain === "insurance" && "+ New Claim"}
                    {activeBoardDomain === "accounting" && "+ New Invoice"}
                    {activeBoardDomain === "hrms" && "+ Add Staff"}
                  </span>
                </button>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter records..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#0073ea]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 font-medium">
                <span className="text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  💡 <em>Click any Status Pill to cycle status live</em>
                </span>
              </div>
            </div>
          )}

          {/* Quick Add Row Drawer */}
          {isAddingItem && activeTab === "table" && (
            <form
              onSubmit={handleAddPatientRow}
              className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2"
            >
              <input
                type="text"
                placeholder={
                  activeBoardDomain === "triage"
                    ? "Patient Full Name..."
                    : activeBoardDomain === "insurance"
                    ? "Patient / Claim Name..."
                    : "Entity / Staff Name..."
                }
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0073ea]"
                autoFocus
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#00c875] hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
              >
                Add to Board
              </button>
              <button
                type="button"
                onClick={() => setIsAddingItem(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
            </form>
          )}

          {/* ─── DOMAIN 1: CLINICAL PATIENT TRIAGE BOARD ─── */}
          {activeBoardDomain === "triage" && activeTab === "table" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/80">
                    <th className="py-3 px-4 w-[240px]">Patient Record</th>
                    <th className="py-3 px-3 w-[160px] text-center">Status Pill (Click to Change)</th>
                    <th className="py-3 px-3 w-[120px] text-center">Priority</th>
                    <th className="py-3 px-3 w-[180px]">Assigned Specialist</th>
                    <th className="py-3 px-3 w-[130px]">Bed / Unit</th>
                    <th className="py-3 px-3 w-[140px]">Vitals Telemetry</th>
                    <th className="py-3 px-3 w-[120px]">Billing (ZMW)</th>
                    <th className="py-3 px-3 w-[130px] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      onClick={() => navigate(patient.route)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 group-hover:text-blue-400 transition-colors">
                          <span>{patient.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({patient.ageGender})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                          {patient.service}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => cyclePatientStatus(patient.id, e)}
                          title="Click to cycle status"
                          className={`w-full py-1.5 px-3 rounded-full text-xs font-black text-white text-center shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1 ${patient.statusColor}`}
                        >
                          <span>{patient.status}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-extrabold text-white ${patient.priorityBg}`}>
                          {patient.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-xs text-slate-200">{patient.doctor}</div>
                        <div className="text-[10px] text-slate-400">{patient.doctorRole}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-800/90 font-mono text-[11px] font-semibold text-slate-300 border border-slate-700">
                          {patient.location}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono">
                        <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                          <HeartPulse className="h-3.5 w-3.5 animate-pulse" />
                          <span>{patient.vitalScore.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                        {patient.cost}
                      </td>
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
            </div>
          )}

          {/* ─── DOMAIN 2: INSURANCE & NHIMA CLAIMS BOARD ─── */}
          {activeBoardDomain === "insurance" && activeTab === "table" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/80">
                    <th className="py-3 px-4 w-[220px]">Claimant & Policy #</th>
                    <th className="py-3 px-3 w-[150px]">Insurance Provider</th>
                    <th className="py-3 px-3 w-[170px] text-center">Adjudication Status</th>
                    <th className="py-3 px-3 w-[160px]">ICD-10 Diagnostic Code</th>
                    <th className="py-3 px-3 w-[130px]">Claim Amount</th>
                    <th className="py-3 px-3 w-[160px]">Hospital / Provider</th>
                    <th className="py-3 px-3 w-[120px]">Payout ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-slate-100">{claim.patientName}</div>
                        <div className="text-[11px] font-mono text-emerald-400">{claim.nhimaNumber}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black text-white ${claim.insurerColor}`}>
                          {claim.insurer}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => cycleClaimStatus(claim.id, e)}
                          title="Click to cycle claim status"
                          className={`w-full py-1.5 px-3 rounded-full text-xs font-black text-white text-center shadow-md transition-all hover:scale-105 active:scale-95 ${claim.statusColor}`}
                        >
                          {claim.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-200">
                        {claim.icdCode}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-black text-emerald-400">
                        {claim.claimAmount}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-300 font-medium">
                        {claim.hospital}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-400">
                        {claim.payoutDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── DOMAIN 3: ACCOUNTING & FINANCIAL LEDGER ─── */}
          {activeBoardDomain === "accounting" && activeTab === "table" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/80">
                    <th className="py-3 px-4 w-[240px]">Invoice & Payer</th>
                    <th className="py-3 px-3 w-[150px]">Revenue Category</th>
                    <th className="py-3 px-3 w-[140px]">Gross Tariff</th>
                    <th className="py-3 px-3 w-[150px]">Doctor Share (Split)</th>
                    <th className="py-3 px-3 w-[130px]">Tax / VAT (16%)</th>
                    <th className="py-3 px-3 w-[150px] text-center">Ledger Status</th>
                    <th className="py-3 px-3 w-[140px]">Payment Gateway</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {accounting.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-slate-100">{inv.invoiceTo}</div>
                        <div className="text-[11px] font-mono text-slate-400">{inv.id}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-[11px] font-bold text-slate-300">
                          {inv.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-black text-emerald-400">
                        {inv.amount}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-200">
                        {inv.doctorShare}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-400">
                        {inv.taxVat}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block w-full py-1.5 px-3 rounded-full text-xs font-black text-white ${inv.statusColor}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-300 font-bold">
                        {inv.paymentMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── DOMAIN 4: HRMS & STAFF ROSTER ─── */}
          {activeBoardDomain === "hrms" && activeTab === "table" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/80">
                    <th className="py-3 px-4 w-[240px]">Staff Practitioner</th>
                    <th className="py-3 px-3 w-[180px]">HPCZ License Reg #</th>
                    <th className="py-3 px-3 w-[150px] text-center">Duty Status</th>
                    <th className="py-3 px-3 w-[200px]">Assigned Shift Horizon</th>
                    <th className="py-3 px-3 w-[130px]">Weekly Hours</th>
                    <th className="py-3 px-3 w-[150px] text-center">HPCZ Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {hrms.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-slate-100">{staff.staffName}</div>
                        <div className="text-[11px] text-slate-400">{staff.role}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-blue-400">
                        {staff.hpczNumber}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block w-full py-1.5 px-3 rounded-full text-xs font-black text-white ${staff.statusColor}`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-300 font-medium">
                        {staff.shift}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs font-bold text-slate-200">
                        {staff.hoursLogged}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-black ${staff.complianceBg}`}>
                          {staff.compliance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kanban / Cards View for other tabs */}
          {activeTab === "kanban" && (
            <div className="p-5 bg-slate-950 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Intake & Pre-Auth", count: "3 Pending", color: "border-amber-500/50" },
                { title: "Active Clinical Care", count: "5 In Progress", color: "border-blue-500/50" },
                { title: "ICU & Adjudication", count: "2 Reviewing", color: "border-purple-500/50" },
                { title: "Discharge & Settled", count: "8 Complete", color: "border-emerald-500/50" },
              ].map((stage) => (
                <div key={stage.title} className={`p-4 rounded-2xl bg-slate-900/90 border ${stage.color} space-y-3`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-extrabold text-xs text-white">{stage.title}</h3>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{stage.count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400">REC-782</span>
                    <h4 className="font-extrabold text-sm text-slate-100">Live WorkOS Item</h4>
                    <p className="text-xs text-slate-400">Auto-synced with NHIMA & EMR</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline View */}
          {activeTab === "timeline" && (
            <div className="p-6 bg-slate-950 space-y-4">
              <div className="text-xs font-bold text-slate-300">Operational Shift & Claims Payout Horizon</div>
              {[
                { title: "Shift A: ER Trauma & ICU", progress: 85, color: "bg-[#00c875]" },
                { title: "NHIMA Weekly Batch Claims Sync", progress: 65, color: "bg-[#0073ea]" },
                { title: "Staff Roster & Payroll Pre-Calculation", progress: 45, color: "bg-[#a25ddc]" },
                { title: "Pharmacy Dispense & Inventory Re-stock", progress: 95, color: "bg-[#fdab3d]" },
              ].map((item) => (
                <div key={item.title} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                  <span className="text-xs font-extrabold text-slate-200 w-64 truncate">{item.title}</span>
                  <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.progress}%` }} />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-300 w-12 text-right">{item.progress}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Telemetry Stats View */}
          {activeTab === "stats" && (
            <div className="p-6 bg-slate-950 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">Verified Doctors</div>
                <div className="text-3xl font-black font-mono text-[#0073ea] mt-1">{formatStat(stats.doctors)}</div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-1">✓ 100% HPCZ Registered</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">NHIMA Claims Processed</div>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">K14.2M</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">99.8% Acceptance Rate</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">Hospital Networks</div>
                <div className="text-3xl font-black font-mono text-purple-400 mt-1">{formatStat(stats.hospitals)}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">Live ICU & Bed Links</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">Average Intake Time</div>
                <div className="text-3xl font-black font-mono text-amber-400 mt-1">&lt; 9.5m</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-1">Fastest in Zambia</div>
              </div>
            </div>
          )}

          {/* Automations View */}
          {activeTab === "automations" && (
            <div className="p-6 bg-slate-950 space-y-3">
              {[
                {
                  trigger: "When patient status → 'Stuck / Critical'",
                  action: "Send WhatsApp alert to on-call ICU physician + notify triage nurse",
                  freq: "Executed 18 times today",
                },
                {
                  trigger: "When digital prescription is signed by doctor",
                  action: "Auto-dispatch e-prescription to nearest NHIMA pharmacy for delivery",
                  freq: "Executed 44 times today",
                },
                {
                  trigger: "When insurance claim is approved by NHIMA",
                  action: "Post revenue split to Doctor Ledger + issue VAT tax invoice",
                  freq: "Executed 72 times today",
                },
              ].map((recipe, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">{recipe.trigger}</div>
                    <div className="text-xs text-slate-400">&rarr; {recipe.action}</div>
                    <div className="text-[10px] font-mono text-emerald-400">{recipe.freq}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Board Footer Summary */}
          <div className="px-4 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-4">
              <span>Domain: <strong>{activeBoardDomain.toUpperCase()}</strong></span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                NHIMA & HPCZ Fully Compliant
              </span>
            </div>

            <button
              onClick={() => navigate("/workos")}
              className="text-[#0073ea] hover:text-blue-300 font-black flex items-center gap-1 transition-colors"
            >
              <span>Open Complete WorkOS CRM Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
