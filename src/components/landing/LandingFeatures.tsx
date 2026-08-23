import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Search, Calendar, Video, Shield, Zap, Building2,
  ChevronRight, Star, CheckCircle, ArrowRight, Activity,
  Pill, UserCheck, Sparkles, Table, Kanban, BarChart3,
  HeartPulse, BrainCircuit, Layers, GitMerge, Phone
} from "lucide-react";

/* ─── How It Works Steps ─── */
export const HowItWorks = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-slate-900 border-t border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 mb-3">
            Structured Clinical Workflow
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            From Intake to Discharge in 4 Steps
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium mt-2">
            Standardized care workflow built for zero-friction clinical velocity
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { step: "01", title: "Search & Match", desc: "Filter verified doctors by specialty, insurance, and city", icon: Search, route: "/search", statusTag: "Instant", color: "from-blue-500 to-blue-600" },
            { step: "02", title: "Compare & Review", desc: "Inspect verified ratings, consultation fees & availability", icon: Star, route: "/providers", statusTag: "Verified", color: "from-purple-500 to-purple-600" },
            { step: "03", title: "Book Instantly", desc: "Select time slot and confirm — no phone calls needed", icon: Calendar, route: "/appointments", statusTag: "Auto-Confirmed", color: "from-emerald-500 to-emerald-600" },
            { step: "04", title: "Consult & Follow-up", desc: "In-person visit or HD encrypted video consultation", icon: Video, route: "/video-dashboard", statusTag: "HD Encrypted", color: "from-amber-500 to-orange-500" },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => navigate(item.route)}
              className="relative p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
            >
              {/* Glow accent top */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${item.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-mono font-black text-slate-500">STEP {item.step}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${item.color} shadow-sm`}>
                  {item.statusTag}
                </span>
              </div>

              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                <item.icon className="h-5 w-5" />
              </div>

              <h3 className="font-extrabold text-base text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Connected Care Experience ─── */
export const CareExperience = () => (
  <section className="py-20 bg-slate-950 border-t border-slate-800 transition-colors">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <Activity className="h-3.5 w-3.5" />
            <span>Connected Healthcare WorkOS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            One Unified Care Journey, <br />
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Engineered for Simplicity.</span>
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            Seamlessly navigate between searching verified specialists, locking in appointment slots, managing pharmacy orders, and tracking vitals — all in one CRM board.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { badge: "Verified", badgeColor: "bg-[#00c875]", title: "In-Person & Telehealth", desc: "Real-time doctor calendar availability" },
              { badge: "Automated", badgeColor: "bg-[#579bfc]", title: "Digital Prescriptions", desc: "Direct dispatch to local pharmacies" },
              { badge: "AI-Powered", badgeColor: "bg-[#a25ddc]", title: "MedGemma AI Diagnostics", desc: "Clinical triage & symptom analysis" },
              { badge: "Secure", badgeColor: "bg-[#fdab3d]", title: "NHIMA Compliant", desc: "Insurance verification & billing" },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-blue-500/40 transition-all">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${item.badgeColor} mb-2`}>
                  {item.badge}
                </span>
                <div className="font-extrabold text-sm text-white">{item.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-blue-500/5">
          <div className="rounded-xl overflow-hidden border border-slate-800 relative">
            <img
              src="https://images.unsplash.com/photo-1758691462743-f9fc9e430d39?auto=format&fit=crop&w=1200&q=85"
              alt="Telehealth consult"
              className="h-64 w-full object-cover"
            />
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-950/95 border border-slate-800 backdrop-blur-md flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xs text-white">Lusaka Central Clinic</div>
                <div className="text-[11px] text-slate-400">Dr. Sarah Jenkins • HD Teleconsult Active</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-[#00c875]">
                Live Visit
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

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
      title: "Full Monday CRM Patient Intake Board",
      desc: "Manage every patient record, clinical status, assigned doctor, bed allocation, and billing in one live CRM board — exactly like monday.com but built for healthcare.",
      metrics: ["+45% triage velocity", "98.4% patient satisfaction", "< 12 min avg intake"],
      badge: { label: "Live Board", color: "bg-[#0073ea]" },
      preview: (
        <div className="space-y-2">
          {[
            { name: "Chanda Mulenga", status: "Stuck / Critical", statusColor: "bg-[#e2445c]", priority: "Urgent", location: "ER-B1" },
            { name: "Thandiwe Banda", status: "In Progress", statusColor: "bg-[#fdab3d]", priority: "High", location: "ER-B4" },
            { name: "Kabwe Bwalya", status: "Under Review", statusColor: "bg-[#a25ddc]", priority: "High", location: "ICU-3" },
            { name: "Grace Tembo", status: "Done", statusColor: "bg-[#00c875]", priority: "Routine", location: "Ward 2A" },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-bold text-xs text-slate-200 w-32 truncate">{p.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${p.statusColor} flex-shrink-0`}>{p.status}</span>
              <span className="text-[11px] text-slate-400 font-mono ml-auto">{p.location}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      tab: "Clinical Pipeline Funnel",
      icon: BarChart3,
      color: "text-purple-400",
      accentColor: "border-purple-500",
      title: "CRM Conversion Funnel for Clinical Journeys",
      desc: "Visualize patient movement through Emergency Intake → Diagnosis → Treatment → Discharge pipeline with conversion rates and bottleneck alerts.",
      metrics: ["Full pipeline visibility", "Auto stage transitions", "Real-time KPIs"],
      badge: { label: "Funnel View", color: "bg-[#a25ddc]" },
      preview: (
        <div className="space-y-2">
          {[
            { label: "Emergency Intake", count: 24, color: "bg-[#e2445c]", pct: 100 },
            { label: "Triage & Diagnosis", count: 18, color: "bg-[#fdab3d]", pct: 75 },
            { label: "Active Treatment", count: 12, color: "bg-[#579bfc]", pct: 50 },
            { label: "Discharge Ready", count: 6, color: "bg-[#00c875]", pct: 25 },
          ].map((stage) => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-36 font-medium truncate">{stage.label}</span>
              <div className="flex-1 h-6 rounded-lg bg-slate-800 overflow-hidden relative">
                <div className={`h-full ${stage.color} rounded-lg flex items-center justify-end pr-2`} style={{ width: `${stage.pct}%` }}>
                  <span className="text-[10px] text-white font-black">{stage.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      tab: "No-Code Automations",
      icon: Zap,
      color: "text-amber-400",
      accentColor: "border-amber-500",
      title: "monday.com-Style Clinical Automations",
      desc: "Build powerful no-code automation rules — trigger WhatsApp alerts when a patient status changes to Critical, auto-assign beds, generate invoices, and more.",
      metrics: ["3 active automations", "Zero manual follow-ups", "Instant SMS & WhatsApp"],
      badge: { label: "⚡ Active", color: "bg-amber-500" },
      preview: (
        <div className="space-y-2">
          {[
            { trigger: "Status → Stuck / Critical", action: "SMS to On-Call Doctor + ICU Alert", active: true },
            { trigger: "Patient intake completes", action: "MedGemma AI triage classification", active: true },
            { trigger: "Status → Done", action: "Generate PDF invoice + move to Discharge", active: true },
          ].map((rule, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs font-bold text-slate-200">When <span className="text-blue-400">{rule.trigger}</span></div>
              <div className="text-[11px] text-slate-400 mt-0.5">→ {rule.action}</div>
              <div className="mt-1.5 flex justify-end">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">ACTIVE</span>
              </div>
            </div>
          ))}
        </div>
      )
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
        <div className="space-y-2 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">🧠 AI Triage →</span>
            <p className="text-cyan-300 mt-1">Patient PAT-801: <strong>High STEMI probability</strong>. Recommend ECG + troponin panel immediately. Cardiology consult flagged.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">💊 Prescription Check →</span>
            <p className="text-emerald-300 mt-1">No contraindications found for Metformin 500mg. Safe to dispense. Patient allergy profile clear.</p>
          </div>
        </div>
      )
    },
    {
      tab: "Integrations Hub",
      icon: Layers,
      color: "text-indigo-400",
      accentColor: "border-indigo-500",
      title: "5 Enterprise Integrations Out of the Box",
      desc: "Connect Supabase for real-time sync, Twilio for WhatsApp & SMS, DPO & PayPal for payments, HuggingFace for MedGemma AI, and Zapier for custom webhooks.",
      metrics: ["Supabase Realtime", "Twilio SMS & WhatsApp", "DPO & PayPal Payments"],
      badge: { label: "🔌 5 Connected", color: "bg-indigo-500" },
      preview: (
        <div className="grid grid-cols-2 gap-2">
          {["Supabase Realtime Sync", "Twilio WhatsApp & SMS", "DPO & PayPal Payments", "HuggingFace MedGemma AI", "Zapier Webhooks", "NHIMA Verification API"].map((app) => (
            <div key={app} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">{app}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      )
    },
  ];

  const active = features[activeFeature];

  return (
    <section className="py-20 bg-slate-900 border-t border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20 mb-3">
            Product Feature Showcase
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Everything you need to run <br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">clinical operations at scale.</span>
          </h2>
        </div>

        {/* Feature Tab Switcher */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {features.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFeature(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                activeFeature === i
                  ? `bg-slate-950 text-white ${f.accentColor} shadow-lg`
                  : "bg-slate-950/50 text-slate-400 border-slate-800 hover:text-white hover:border-slate-600"
              }`}
            >
              <f.icon className={`h-3.5 w-3.5 ${activeFeature === i ? f.color : ""}`} />
              <span>{f.tab}</span>
            </button>
          ))}
        </div>

        {/* Active Feature Panel */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-5">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${active.badge.color}`}>
              {active.badge.label}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">{active.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{active.desc}</p>
            <div className="flex flex-wrap gap-2">
              {active.metrics.map((m) => (
                <span key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  {m}
                </span>
              ))}
            </div>
            <button
              onClick={() => navigate("/workos")}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#0073ea] to-indigo-600 text-white font-extrabold text-sm shadow-xl hover:scale-105 transition-all"
            >
              <span>Try it Live</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <active.icon className={`h-4 w-4 ${active.color}`} />
                <span className="text-xs font-bold text-slate-300">{active.tab}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${active.badge.color}`}>{active.badge.label}</span>
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
    <section className="py-20 bg-slate-950 border-t border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-5">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
              For Healthcare Professionals & Clinics
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Power Your Clinical Practice <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">With Doc' O Clock WorkOS</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Empower your clinic, pharmacy, or hospital with modern CRM tools to manage patient appointments, digital charts, inventory, and billing revenue.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { title: "Zero Upfront Platform Cost", desc: "No hidden setup fees — pay only on confirmed bookings." },
                { title: "Complete EMR & Billing Suite", desc: "Track patient history, write prescriptions, and invoice insurance." },
                { title: "Telehealth HD Video Suite", desc: "Reach patients across all provinces in Zambia directly." },
                { title: "MedGemma AI Diagnostic Copilot", desc: "AI-assisted triage, symptom analysis, and drug interaction checks." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all">
                  <CheckCircle className="h-4 w-4 text-[#00c875] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-extrabold text-sm text-white">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => navigate("/auth?tab=signup")}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-[#0073ea] to-indigo-600 text-white font-black text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <span>Register Practice</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="px-6 py-3 rounded-full bg-slate-900 border border-slate-700 text-slate-200 font-extrabold text-sm hover:border-slate-500 transition-all"
              >
                View Pricing
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#0073ea]" />
                <h3 className="font-extrabold text-sm text-white">Provider Telemetry Overview</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-[#00c875]">
                Live Board
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Today's Visits</div>
                <div className="text-3xl font-black font-mono text-[#0073ea] mt-1">18</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">+4 via Telehealth</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Weekly Revenue</div>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">K24,500</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">+12% vs last week</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Active ICU Beds</div>
                <div className="text-3xl font-black font-mono text-amber-400 mt-1">9/10</div>
                <div className="text-[10px] text-rose-400 font-bold mt-1">90% Occupancy</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Avg Triage Time</div>
                <div className="text-3xl font-black font-mono text-purple-400 mt-1">12m</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">-8m vs manual</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
