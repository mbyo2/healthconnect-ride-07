import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Search, Calendar, Video, Shield, Zap, Building2,
  ChevronRight, Star, CheckCircle, ArrowRight, Activity,
  Pill, UserCheck, Sparkles, Table, Kanban, BarChart3,
  HeartPulse, BrainCircuit, Layers, GitMerge, Phone,
  CheckCircle2, Clock, Users, ArrowUpRight, Cpu, Lock,
  FileText, DollarSign, Briefcase, SlidersHorizontal, Check, ShieldCheck
} from "lucide-react";

/* ─── How It Works: 4-Step Clinical Workflow ─── */
export const HowItWorks = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-[#090d18] border-t border-slate-800/80 transition-colors relative overflow-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-black border border-blue-500/20 mb-3 shadow-inner">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>Standardized Healthcare Workflow</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            From Intake to Discharge in 4 High-Velocity Steps
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium mt-3 leading-relaxed">
            Eliminate manual phone calls, paper charts, and scheduling bottlenecks with Zambia's modern clinical operating system.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Search & Match",
              desc: "Filter 500+ verified doctors by specialty, province, NHIMA insurance acceptance, and fees.",
              icon: Search,
              route: "/search",
              statusTag: "Instant Match",
              color: "from-blue-500 to-blue-600",
              accentBorder: "hover:border-blue-500/60",
            },
            {
              step: "02",
              title: "Inspect & Compare",
              desc: "View verified patient reviews, doctor credentials, clinic locations, and available time slots.",
              icon: Star,
              route: "/healthcare-professionals",
              statusTag: "100% Verified",
              color: "from-purple-500 to-indigo-600",
              accentBorder: "hover:border-purple-500/60",
            },
            {
              step: "03",
              title: "Book & Authorize",
              desc: "Lock in in-person clinic visits or video consults with instant SMS & WhatsApp confirmations.",
              icon: Calendar,
              route: "/appointments",
              statusTag: "Auto-Confirmed",
              color: "from-emerald-500 to-teal-600",
              accentBorder: "hover:border-emerald-500/60",
            },
            {
              step: "04",
              title: "Consult & Fulfill",
              desc: "Attend HD encrypted teleconsults and receive digital prescriptions routed directly to local pharmacies.",
              icon: Video,
              route: "/video-dashboard",
              statusTag: "HD Encrypted",
              color: "from-amber-500 to-rose-500",
              accentBorder: "hover:border-amber-500/60",
            },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => navigate(item.route)}
              className={`relative p-6 rounded-3xl bg-slate-950/80 border border-slate-800 ${item.accentBorder} transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-2xl shadow-slate-950 overflow-hidden flex flex-col justify-between`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color} opacity-70 group-hover:opacity-100 transition-opacity`} />

              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-mono font-black text-slate-500 group-hover:text-white transition-colors">
                    STEP {item.step}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r ${item.color} shadow-md`}>
                    {item.statusTag}
                  </span>
                </div>

                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-6 w-6" />
                </div>

                <h3 className="font-extrabold text-lg text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-900 flex items-center text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors">
                <span>Explore step</span>
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Connected Care Experience ─── */
export const CareExperience = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-slate-950 border-t border-slate-800/80 transition-colors relative">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black">
              <Activity className="h-3.5 w-3.5" />
              <span>Connected Healthcare WorkOS</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
              One Unified Care Journey, <br />
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Engineered for Zero Friction.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Seamlessly navigate between searching verified specialists, locking in appointment slots, managing pharmacy orders, and tracking vitals — all in one synchronized CRM board.
            </p>

            <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
              {[
                {
                  badge: "Verified",
                  badgeColor: "bg-[#00c875]",
                  title: "In-Person & Telehealth",
                  desc: "Real-time doctor calendar availability across all 10 Zambian provinces.",
                  route: "/search",
                },
                {
                  badge: "Automated",
                  badgeColor: "bg-[#579bfc]",
                  title: "Digital Prescriptions",
                  desc: "Direct electronic dispatch to local pharmacies with doorstep delivery.",
                  route: "/search?type=pharmacy",
                },
                {
                  badge: "AI Copilot",
                  badgeColor: "bg-[#a25ddc]",
                  title: "MedGemma AI Diagnostics",
                  desc: "Clinical triage classification, symptom analysis, and drug interaction checks.",
                  route: "/workos",
                },
                {
                  badge: "Claims Engine",
                  badgeColor: "bg-[#fdab3d]",
                  title: "NHIMA Integrated",
                  desc: "Automated patient insurance eligibility verification and claim pre-authorization.",
                  route: "/pricing",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  onClick={() => navigate(item.route)}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer group"
                >
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${item.badgeColor} mb-2 shadow-xs`}>
                    {item.badge}
                  </span>
                  <div className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 leading-snug">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 shadow-2xl shadow-blue-950/20 backdrop-blur-xl">
            <div className="rounded-2xl overflow-hidden border border-slate-800 relative group">
              <img
                src="https://images.unsplash.com/photo-1758691462743-f9fc9e430d39?auto=format&fit=crop&w=1200&q=85"
                alt="Telehealth consultation on Doc' O Clock"
                className="h-72 sm:h-80 w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-slate-950/95 border border-slate-800 backdrop-blur-md flex items-center justify-between shadow-xl">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <span>Lusaka Central Medical Clinic</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dr. Sarah Jenkins • HD Encrypted Video Visit
                  </div>
                </div>
                <button
                  onClick={() => navigate("/video-dashboard")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-[#00c875] hover:bg-emerald-600 shadow-md transition-all active:scale-95 shrink-0"
                >
                  Join Call &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Monday CRM Tabbed Feature Showcase ─── */
export const Features = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      tab: "Patient Intake & Triage",
      icon: Table,
      color: "text-blue-400",
      accentColor: "border-blue-500",
      title: "Unified Clinical Patient Intake Board",
      desc: "Manage every patient record, clinical status, assigned doctor, bed allocation, and vitals in one live interactive board built specifically for modern healthcare velocity.",
      metrics: ["+45% triage velocity", "98.4% patient satisfaction", "< 12 min avg intake"],
      badge: { label: "Live Board", color: "bg-[#0073ea]" },
      preview: (
        <div className="space-y-2.5">
          {[
            { id: "PAT-801", name: "Chanda Mulenga", status: "Critical / ICU", statusColor: "bg-[#e2445c]", priority: "Urgent !!!", location: "ER-B1", vitals: "98% SpO2" },
            { id: "PAT-802", name: "Thandiwe Banda", status: "In Progress", statusColor: "bg-[#fdab3d]", priority: "High", location: "ER-B4", vitals: "95% SpO2" },
            { id: "PAT-803", name: "Kabwe Bwalya", status: "Under Review", statusColor: "bg-[#a25ddc]", priority: "High", location: "ICU-3", vitals: "97% SpO2" },
            { id: "PAT-804", name: "Grace Tembo", status: "Done", statusColor: "bg-[#00c875]", priority: "Routine", location: "Ward 2A", vitals: "99% SpO2" },
          ].map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] text-slate-500">{p.id}</span>
                <span className="font-extrabold text-xs sm:text-sm text-slate-200">{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${p.statusColor}`}>
                  {p.status}
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{p.location}</span>
                <span className="text-[10px] font-bold text-rose-400 font-mono">{p.vitals}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "Insurance & Claims Engine",
      icon: ShieldCheck,
      color: "text-emerald-400",
      accentColor: "border-emerald-500",
      title: "Automated NHIMA & Private Insurance Claims",
      desc: "Instant policy verification, automated ICD-10 coding, electronic batch claim submission, dispute resolution, and automated payout ledger sync with NHIMA, Cigna, and Madison.",
      metrics: ["99.8% Claims Acceptance", "Instant Pre-Authorization", "Zero Manual Paperwork"],
      badge: { label: "NHIMA Claims", color: "bg-[#00c875]" },
      preview: (
        <div className="space-y-2.5">
          {[
            { id: "CLM-901", patient: "Chanda Mulenga", insurer: "NHIMA Zambia", amount: "ZMW K3,450", status: "Approved", statusColor: "bg-[#00c875]" },
            { id: "CLM-902", patient: "Kabwe Bwalya", insurer: "Prudential Life", amount: "ZMW K12,400", status: "In Adjudication", statusColor: "bg-[#a25ddc]" },
            { id: "CLM-903", patient: "Thandiwe Banda", insurer: "NHIMA Zambia", amount: "ZMW K1,850", status: "Pre-Authorized", statusColor: "bg-[#579bfc]" },
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="font-extrabold text-xs text-white">{c.patient}</span>
                <span className="text-[11px] text-slate-400 block">{c.insurer}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-emerald-400 text-xs">{c.amount}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${c.statusColor}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "Accounting & Billing",
      icon: DollarSign,
      color: "text-amber-400",
      accentColor: "border-amber-500",
      title: "Clinical General Ledger & Doctor Payouts",
      desc: "Full automated accounting suite — multi-currency financial ledger (ZMW & USD), automated doctor fee splits (70/30, 80/20), VAT 16% invoice generator, and mobile money reconciliation.",
      metrics: ["Real-Time General Ledger", "Automated Doctor Share Splits", "VAT 16% Invoicing"],
      badge: { label: "Financial Ledger", color: "bg-[#fdab3d]" },
      preview: (
        <div className="space-y-2.5">
          {[
            { inv: "INV-4401", to: "UTH Hospital Network", total: "K34,800", share: "Dr. Mutale (K24,360)", status: "Settled", statusColor: "bg-[#00c875]" },
            { inv: "INV-4402", to: "Apex Medical Network", total: "K8,450", share: "Dr. Sarah (K6,760)", status: "Processing", statusColor: "bg-[#fdab3d]" },
            { inv: "INV-4403", to: "Kitwe Pharmacy Hub", total: "K14,200", share: "Pharmacy Dispense", status: "Pending Payout", statusColor: "bg-[#579bfc]" },
          ].map((inv, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-slate-400">{inv.inv}</span>
                <div className="font-extrabold text-xs text-white">{inv.to}</div>
                <div className="text-[10px] text-slate-400">{inv.share}</div>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-emerald-400 text-xs block">{inv.total}</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black text-white ${inv.statusColor} mt-1`}>{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "HRMS & Staff Roster",
      icon: Users,
      color: "text-purple-400",
      accentColor: "border-purple-500",
      title: "Clinical Staffing, Shifts & HPCZ Licensing",
      desc: "Doctor & nurse duty roster planning, attendance tracking, on-call shift rotation, Health Professions Council of Zambia (HPCZ) license renewal tracking, and automated clinical payroll calculation.",
      metrics: ["HPCZ License Tracking", "Dynamic Shift Rosters", "Automated Payroll Tiers"],
      badge: { label: "Staff Roster", color: "bg-[#a25ddc]" },
      preview: (
        <div className="space-y-2.5">
          {[
            { name: "Dr. Mutale Mwansa", role: "Chief Cardiology", hpcz: "HPCZ-MED-9921", shift: "Day (08:00-16:00)", status: "On Duty", statusColor: "bg-[#00c875]" },
            { name: "Dr. Sarah Jenkins", role: "Trauma Specialist", hpcz: "HPCZ-MED-4412", shift: "On-Call Trauma", status: "On Call", statusColor: "bg-[#fdab3d]" },
            { name: "Sr. Beatrice Phiri", role: "Head Triage Nurse", hpcz: "HPCZ-NUR-1029", shift: "Night (20:00-08:00)", status: "On Duty", statusColor: "bg-[#00c875]" },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xs text-white">{s.name}</div>
                <div className="text-[10px] text-slate-400">{s.role} • {s.shift}</div>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-blue-400 block">{s.hpcz}</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black text-white ${s.statusColor} mt-1`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "Customizable WorkOS Boards",
      icon: SlidersHorizontal,
      color: "text-rose-400",
      accentColor: "border-rose-500",
      title: "100% Customizable Boards, Columns & Views",
      desc: "Build tailor-made clinical workflows with customizable column types (Status Pills, Formula, Timeline, People, File Uploads, Billing, Location), custom color themes, and custom board templates.",
      metrics: ["Custom Column Types", "Drag & Drop Board Builder", "Multi-View Support"],
      badge: { label: "Custom WorkOS", color: "bg-rose-500" },
      preview: (
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Custom Column: Status Pill Color Picker</span>
            <div className="flex gap-1.5">
              {["bg-[#00c875]", "bg-[#fdab3d]", "bg-[#e2445c]", "bg-[#a25ddc]", "bg-[#0073ea]"].map((c, i) => (
                <span key={i} className={`w-4 h-4 rounded-full ${c}`} />
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Custom Formulas: Doctor Split Calculation</span>
            <span className="font-mono text-xs text-emerald-400 font-bold">Billing * 0.70</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Views: Table, Kanban, Timeline, Telemetry</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">CUSTOMIZED</span>
          </div>
        </div>
      ),
    },
    {
      tab: "MedGemma AI Copilot",
      icon: BrainCircuit,
      color: "text-cyan-400",
      accentColor: "border-cyan-500",
      title: "Integrated MedGemma AI Clinical Intelligence",
      desc: "AI-powered diagnostic assistance, triage classification, symptom analysis, and treatment suggestion engine — all embedded directly in your WorkOS board.",
      metrics: ["HuggingFace MedGemma", "Smart fallback engine", "Clinical role-awareness"],
      badge: { label: "🤖 AI Powered", color: "bg-cyan-600" },
      preview: (
        <div className="space-y-2.5 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>MedGemma AI Triage Classifier:</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Patient PAT-801: <strong className="text-rose-400">High STEMI probability (94%)</strong>. Flagged for urgent ECG & Troponin I panel. Cardiology consult notified.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Prescription Contraindication Guard:</span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Zero drug-drug interactions detected for Metformin 500mg + Lisinopril 10mg. Patient allergy profile verified clear.
            </p>
          </div>
        </div>
      ),
    },
    {
      tab: "Integrations Hub",
      icon: Layers,
      color: "text-indigo-400",
      accentColor: "border-indigo-500",
      title: "Enterprise Integrations Out of the Box",
      desc: "Connect Supabase for real-time cloud sync, Twilio for WhatsApp & SMS, DPO & PayPal for payments, Hugging Face for MedGemma AI, and Zapier for custom webhook workflows.",
      metrics: ["Supabase Realtime", "Twilio SMS & WhatsApp", "DPO & PayPal Payments"],
      badge: { label: "🔌 6 Connected", color: "bg-indigo-500" },
      preview: (
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { name: "Supabase Realtime Sync", status: "Connected", ping: "42ms" },
            { name: "Twilio WhatsApp & SMS", status: "Active", ping: "99.9%" },
            { name: "DPO & PayPal Payments", status: "Live", ping: "Secure" },
            { name: "MedGemma AI Hub", status: "Active", ping: "v2.0" },
            { name: "NHIMA Claims API", status: "Verified", ping: "Gov" },
            { name: "Zapier Webhooks", status: "Ready", ping: "Sync" },
          ].map((app) => (
            <div key={app.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">{app.name}</div>
                <div className="text-[10px] text-emerald-400 font-mono">{app.ping}</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            </div>
          ))}
        </div>
      ),
    },
  ];

  const active = features[activeFeature];

  return (
    <section className="py-20 bg-[#090d18] border-t border-slate-800/80 transition-colors relative">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-black border border-purple-500/20 mb-3 shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Complete WorkOS CRM Feature Suite</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Everything You Need to Run <br />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
              Clinical, Claims, Financial & HR Operations.
            </span>
          </h2>
        </div>

        {/* Feature Tab Switcher Bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {features.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFeature(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black transition-all border ${
                activeFeature === i
                  ? `bg-slate-950 text-white ${f.accentColor} shadow-xl ring-2 ring-blue-500/20`
                  : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
              }`}
            >
              <f.icon className={`h-4 w-4 ${activeFeature === i ? f.color : "text-slate-500"}`} />
              <span>{f.tab}</span>
            </button>
          ))}
        </div>

        {/* Active Feature Split Panel */}
        <div className="grid lg:grid-cols-2 gap-8 items-center rounded-3xl bg-slate-950 border border-slate-800/90 p-6 sm:p-10 shadow-2xl">
          <div className="space-y-5">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black text-white ${active.badge.color} shadow-md`}>
              {active.badge.label}
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {active.title}
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              {active.desc}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {active.metrics.map((m) => (
                <span
                  key={m}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{m}</span>
                </span>
              ))}
            </div>

            <div className="pt-3">
              <button
                onClick={() => navigate("/workos")}
                className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#0073ea] to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <span>Experience Live Board</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <active.icon className={`h-4 w-4 ${active.color}`} />
                <span className="text-xs font-black text-slate-200">{active.tab} Live View</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${active.badge.color}`}>
                {active.badge.label}
              </span>
            </div>
            {active.preview}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── For Providers Panel ─── */
export const ForProviders = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-slate-950 border-t border-slate-800/80 transition-colors relative">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-black border border-blue-500/20">
              <Building2 className="h-3.5 w-3.5" />
              <span>For Doctors, Clinics, Hospitals & Insurance Networks</span>
            </span>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Power Your Clinical Practice <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                With Doc' O Clock WorkOS.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Empower your clinic, pharmacy, or hospital with modern CRM tools to manage patient appointments, digital charts, bed occupancy, NHIMA claims, and billing revenue.
            </p>

            <div className="space-y-3 pt-2">
              {[
                {
                  title: "Zero Upfront Setup Cost",
                  desc: "No expensive hardware or recurring license lock-in — get started immediately.",
                },
                {
                  title: "Complete Claims & Billing Suite",
                  desc: "Track patient history, submit NHIMA claims electronically, and split doctor revenues automatically.",
                },
                {
                  title: "Telehealth HD Video Suite",
                  desc: "Reach patients across all 10 provinces of Zambia with encrypted teleconsults.",
                },
                {
                  title: "MedGemma AI Diagnostic Copilot",
                  desc: "Clinical triage assistance, symptom analysis, and drug contraindication guardrails.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all"
                >
                  <CheckCircle2 className="h-5 w-5 text-[#00c875] mt-0.5 shrink-0" />
                  <div>
                    <div className="font-extrabold text-sm text-white">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                onClick={() => navigate("/auth?tab=signup")}
                className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#0073ea] to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-black text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <span>Register Practice</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="px-7 py-3.5 rounded-full bg-slate-900 border border-slate-700 text-slate-200 font-extrabold text-sm hover:border-slate-500 hover:text-white transition-all"
              >
                View Pricing & Tariffs
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Activity className="h-5 w-5 text-[#0073ea]" />
                <h3 className="font-extrabold text-base text-white">Provider Telemetry Overview</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black text-white bg-[#00c875] shadow-xs">
                Live Feed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Today's Visits</div>
                <div className="text-3xl font-black font-mono text-[#0073ea] mt-1">24</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">+6 via Telehealth</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Weekly Claims Revenue</div>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">K34,800</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">+18% vs last week</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Active Bed Occupancy</div>
                <div className="text-3xl font-black font-mono text-amber-400 mt-1">85%</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">17/20 Beds In Use</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Avg Triage Speed</div>
                <div className="text-3xl font-black font-mono text-purple-400 mt-1">9.5m</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">-65% vs manual paper</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
