import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Search, Calendar, Video, Shield, Zap, Building2,
  ChevronRight, Star, CheckCircle, ArrowRight, Activity,
  Pill, UserCheck, Sparkles, HeartPulse, BrainCircuit,
  Phone, CheckCircle2, Clock, Users, ArrowUpRight, Lock,
  FileText, ShieldCheck, MapPin, Stethoscope, Smile
} from "lucide-react";

/* ─── How It Works: 4-Step Patient Journey ─── */
export const HowItWorks = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-[#090d18] border-t border-slate-800/80 transition-colors relative overflow-hidden">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-sky-400 text-xs font-black border border-blue-500/20 mb-3 shadow-inner">
            <Activity className="h-3.5 w-3.5 text-sky-400" />
            <span>Healthcare Made Simple</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            How Doc' O Clock Works for You
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium mt-3 leading-relaxed">
            From finding the right specialist to receiving medications at your doorstep in 4 seamless steps.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Find Your Doctor",
              desc: "Search 500+ verified doctors across Zambia by specialty, hospital, insurance, or city.",
              icon: Search,
              route: "/search",
              statusTag: "Instant Search",
              color: "from-blue-600 to-sky-500",
            },
            {
              step: "02",
              title: "Choose Time Slot",
              desc: "Compare ratings, doctor bios, consultation fees, and select your preferred available hour.",
              icon: Calendar,
              route: "/search",
              statusTag: "Live Calendar",
              color: "from-indigo-600 to-purple-600",
            },
            {
              step: "03",
              title: "Consult Video / Clinic",
              desc: "Attend an HD encrypted video call from home or walk into the clinic with zero waiting queue.",
              icon: Video,
              route: "/video-dashboard",
              statusTag: "HD Encrypted",
              color: "from-emerald-600 to-teal-500",
            },
            {
              step: "04",
              title: "Get Prescriptions",
              desc: "Digital e-prescriptions sent straight to your phone and fulfilled by nearby licensed pharmacies.",
              icon: Pill,
              route: "/prescriptions",
              statusTag: "Fast Delivery",
              color: "from-amber-500 to-orange-500",
            },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => navigate(item.route)}
              className="relative p-6 rounded-3xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/60 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-2xl shadow-slate-950 flex flex-col justify-between"
            >
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

                <h3 className="font-extrabold text-lg text-white mb-2 group-hover:text-sky-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-900 flex items-center text-xs font-bold text-slate-300 group-hover:text-sky-400 transition-colors">
                <span>Book this step</span>
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
              <HeartPulse className="h-3.5 w-3.5" />
              <span>Complete Healthcare Ecosystem</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Care That Fits into <br />
              <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                Your Everyday Life.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Doc' O Clock brings doctors, pharmacies, diagnostic labs, and hospitals together in one intuitive mobile experience. Get care in minutes, anywhere in Zambia.
            </p>

            <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
              {[
                {
                  badge: "24/7 Access",
                  badgeColor: "bg-blue-600",
                  title: "Video Telehealth",
                  desc: "Connect with certified general doctors and pediatricians in under 15 minutes.",
                  route: "/video-dashboard",
                },
                {
                  badge: "Doorstep",
                  badgeColor: "bg-emerald-600",
                  title: "Pharmacy Delivery",
                  desc: "Order genuine prescribed medications delivered safely to your home.",
                  route: "/search?type=pharmacy",
                },
                {
                  badge: "NHIMA",
                  badgeColor: "bg-amber-600",
                  title: "Insurance Accepted",
                  desc: "Zero-hassle digital claims and instant insurance card verification.",
                  route: "/pricing",
                },
                {
                  badge: "Emergency",
                  badgeColor: "bg-rose-600",
                  title: "24/7 Ambulance & ER",
                  desc: "One-tap emergency dispatch and hospital bed reservation.",
                  route: "/emergency",
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
                  <div className="font-extrabold text-sm text-white group-hover:text-sky-400 transition-colors">
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
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85"
                alt="Doctor consultation on Doc' O Clock"
                className="h-72 sm:h-80 w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-slate-950/95 border border-slate-800 backdrop-blur-md flex items-center justify-between shadow-xl">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <span>Lusaka Apex Medical Clinic</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dr. Sarah Jenkins • Live Telehealth Consult
                  </div>
                </div>
                <button
                  onClick={() => navigate("/video-dashboard")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all active:scale-95 shrink-0"
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

/* ─── Interactive Feature Showcase ─── */
export const Features = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      tab: "Doctor Consultations",
      icon: Stethoscope,
      color: "text-sky-400",
      accentColor: "border-sky-500",
      title: "Book Verified Doctors & Medical Specialists",
      desc: "Browse certified practitioners across 20+ specialties. View verified patient reviews, hospital credentials, available appointment slots, and book in seconds.",
      metrics: ["500+ Verified Doctors", "Zero Booking Fees", "Instant Confirmations"],
      badge: { label: "Top Rated", color: "bg-blue-600" },
      preview: (
        <div className="space-y-2.5">
          {[
            { name: "Dr. Mutale Mwansa", specialty: "Cardiology", location: "UTH Lusaka", rating: "4.9 ★", slots: "3 Available Today" },
            { name: "Dr. Sarah Jenkins", specialty: "Emergency Trauma", location: "CIMA Health", rating: "4.8 ★", slots: "10:00 AM Video" },
            { name: "Dr. Elena Rostova", specialty: "General Medicine", location: "Ndola Care Hub", rating: "5.0 ★", slots: "2:00 PM Clinic" },
          ].map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <div className="font-black text-xs sm:text-sm text-white">{d.name}</div>
                <div className="text-[11px] text-slate-400">{d.specialty} • {d.location}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-400 block">{d.rating}</span>
                <span className="text-[10px] text-emerald-400 font-medium">{d.slots}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "Digital Prescriptions",
      icon: Pill,
      color: "text-emerald-400",
      accentColor: "border-emerald-500",
      title: "E-Prescriptions & Same-Day Pharmacy Delivery",
      desc: "Doctors generate secure e-prescriptions sent instantly to your Doc' O Clock app. Fulfill medications with one tap from local licensed pharmacies with doorstep delivery.",
      metrics: ["Direct Pharmacy Routing", "100% Genuine Medicines", "Doorstep Delivery"],
      badge: { label: "Fast Dispense", color: "bg-emerald-600" },
      preview: (
        <div className="space-y-2.5">
          {[
            { med: "Amoxicillin 500mg (20 Caps)", doc: "Prescribed by Dr. Mutale Mwansa", pharmacy: "Lusaka Apex Pharmacy", status: "Out for Delivery" },
            { med: "Metformin 500mg (60 Tabs)", doc: "Prescribed by Dr. Elena Rostova", pharmacy: "Medland Health Pharmacy", status: "Ready for Pickup" },
          ].map((p, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">{p.med}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400">
                  {p.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">{p.doc}</div>
              <div className="text-[10px] text-slate-500">{p.pharmacy}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "NHIMA Insurance",
      icon: ShieldCheck,
      color: "text-amber-400",
      accentColor: "border-amber-500",
      title: "Seamless NHIMA & Private Insurance Coverage",
      desc: "Doc' O Clock integrates directly with the National Health Insurance Management Authority (NHIMA) and private insurers. Access covered consultations, lab tests, and hospital care without out-of-pocket stress.",
      metrics: ["Instant Eligibility Check", "Zero Paper Claims", "Full NHIMA Network"],
      badge: { label: "Gov Accredited", color: "bg-amber-600" },
      preview: (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-black text-white">NHIMA Insurance Card #8829104</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">ACTIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Consultation Co-pay</span>
              <span className="font-bold text-emerald-400">100% Covered (K0)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Prescription Benefit</span>
              <span className="font-bold text-emerald-400">Full Coverage</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      tab: "Emergency & Hospitals",
      icon: HeartPulse,
      color: "text-rose-400",
      accentColor: "border-rose-500",
      title: "24/7 Emergency Ambulance & Bed Finder",
      desc: "In medical emergencies, every second counts. Find the nearest open ICU hospital, track ambulance ETA, and alert emergency physicians before you arrive.",
      metrics: ["992 Direct Dispatch", "Real-Time Bed Occupancy", "Trauma Ready"],
      badge: { label: "24/7 Emergency", color: "bg-rose-600" },
      preview: (
        <div className="space-y-2.5">
          {[
            { hospital: "University Teaching Hospital (UTH)", er: "Trauma Level 1 • 4 ICU Beds Open", distance: "2.4 km away" },
            { hospital: "CIMA Medical Center", er: "24/7 Emergency Room • Open", distance: "4.1 km away" },
          ].map((h, i) => (
            <div key={i} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-white">{h.hospital}</div>
                <div className="text-[10px] text-rose-400 font-medium">{h.er}</div>
              </div>
              <span className="text-xs font-bold text-slate-400">{h.distance}</span>
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
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-sky-400 text-xs font-black border border-blue-500/20 mb-3 shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            <span>Doc' O Clock Core Features</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Modern Healthcare, Designed Around You.
          </h2>
        </div>

        {/* Feature Tab Switcher Bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {features.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFeature(i)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all border ${
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
                onClick={() => navigate("/search")}
                className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <span>Find Doctors Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <active.icon className={`h-4 w-4 ${active.color}`} />
                <span className="text-xs font-black text-slate-200">{active.tab} Preview</span>
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

/* ─── For Healthcare Providers ─── */
export const ForProviders = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-slate-950 border-t border-slate-800/80 transition-colors relative">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-sky-400 text-xs font-black border border-blue-500/20">
              <Building2 className="h-3.5 w-3.5" />
              <span>For Doctors, Clinics & Hospitals</span>
            </span>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Grow Your Medical Practice <br />
              <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                With Doc' O Clock.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Join hundreds of medical practitioners and healthcare institutions reaching thousands of patients daily across Zambia. Manage bookings, telehealth visits, e-prescriptions, and NHIMA billing in one place.
            </p>

            <div className="space-y-3 pt-2">
              {[
                {
                  title: "Zero Setup Cost",
                  desc: "Create your verified doctor profile and start accepting bookings today.",
                },
                {
                  title: "HD Video Telehealth Suite",
                  desc: "Consult patients remotely with encrypted video and automated notes.",
                },
                {
                  title: "Digital Prescription & EMR Suite",
                  desc: "Send digital scripts straight to pharmacies and manage patient records securely.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
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
                className="px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <span>Join as a Healthcare Provider</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="px-7 py-3.5 rounded-full bg-slate-900 border border-slate-700 text-slate-200 font-extrabold text-sm hover:border-slate-500 hover:text-white transition-all"
              >
                View Plans & Tariffs
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Activity className="h-5 w-5 text-sky-400" />
                <h3 className="font-extrabold text-base text-white">Practitioner Telemetry Overview</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black text-white bg-emerald-500 shadow-xs">
                Live Feed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Today's Visits</div>
                <div className="text-3xl font-black font-mono text-sky-400 mt-1">24</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">+8 via Telehealth</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Patient Satisfaction</div>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">4.9 ★</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">98.4% Positive</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Avg Booking Speed</div>
                <div className="text-3xl font-black font-mono text-amber-400 mt-1">&lt; 1 min</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">Direct from phone</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Active Cities</div>
                <div className="text-3xl font-black font-mono text-purple-400 mt-1">10 / 10</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">All Provinces in Zambia</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
