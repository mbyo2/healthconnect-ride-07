import { useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { ArrowRight, Sparkles, CheckCircle2, Zap, Shield, Globe, Lock, Mail, Activity, ShieldCheck, DollarSign, Users } from "lucide-react";
import { useState } from "react";

/* ─── Browse Specialties Catalog ─── */
export const BrowseSpecialties = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-[#090d18] border-t border-slate-800/80 transition-colors">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-black border border-blue-500/20 mb-3 shadow-inner">
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            <span>National Medical Directory</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Browse Healthcare Specialties Across Zambia
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium mt-2 leading-relaxed">
            Access certified clinical specialists, trauma surgeons, and pediatricians across all 10 provinces.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
          {[
            "General Practice",
            "Cardiology",
            "Dermatology",
            "Pediatrics",
            "Gynecology & Obstetrics",
            "Orthopedic Surgery",
            "Psychiatry & Mental Health",
            "Dentistry & Oral Health",
            "Ophthalmology",
            "ENT / Otolaryngology",
            "Neurology",
            "Urology",
            "Radiology & Imaging",
            "Oncology",
            "Emergency Medicine",
            "Internal Medicine",
          ].map((specialty) => (
            <button
              key={specialty}
              onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
              className="px-4 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-xs sm:text-sm font-bold text-slate-300 hover:border-[#0073ea] hover:text-white hover:bg-slate-800 hover:scale-105 transition-all shadow-sm"
            >
              {specialty}
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/search")}
            className="text-[#0073ea] hover:text-blue-300 font-black text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Explore all doctors, pharmacies, and clinics in Zambia</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

/* ─── High-Converting CTA Banner Section ─── */
export const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-slate-950 border-t border-slate-800/80 transition-colors relative overflow-hidden">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden p-8 sm:p-14 lg:p-16 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d142b] to-[#161233] border border-slate-800 shadow-2xl">
          {/* Luminous background blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center lg:text-left max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-black border border-white/20 shadow-inner">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>✨ Instant Access — Free Forever for Patients</span>
              </span>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                Ready to run clinical triage, claims, accounting & HRMS on one WorkOS?
              </h2>

              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                Join thousands of healthcare practitioners, hospital executives, and pharmacy operators leveraging Zambia's most comprehensive WorkOS.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                {[
                  "Free to get started",
                  "NHIMA Claims Auto-Sync",
                  "Accounting & Doctor Revenue Splits",
                  "HPCZ Verified & 256-Bit Encrypted",
                ].map((badge) => (
                  <span key={badge} className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{badge}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => navigate("/auth?tab=signup")}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-[#0073ea] via-indigo-600 to-[#a25ddc] hover:from-blue-600 hover:to-purple-600 text-white font-black text-sm sm:text-base shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => navigate("/workos")}
                className="px-8 py-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white font-black text-sm transition-all flex items-center justify-center gap-2 hover:scale-105"
              >
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Open WorkOS Demo Board</span>
              </button>

              <button
                onClick={() => navigate("/search")}
                className="px-8 py-3.5 rounded-full border border-slate-800 hover:border-slate-600 bg-slate-950/60 text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <Globe className="h-4 w-4 text-blue-400" />
                <span>Find a Doctor or Clinic</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Structured Monday-Style Footer ─── */
const FOOTER_SECTIONS = [
  {
    title: "Clinical WorkOS",
    links: [
      { label: "Patient Triage Board", href: "/workos" },
      { label: "NHIMA Insurance & Claims", href: "/workos" },
      { label: "Accounting & General Ledger", href: "/workos" },
      { label: "HRMS & Staff Roster", href: "/workos" },
      { label: "MedGemma AI Copilot", href: "/workos" },
    ],
  },
  {
    title: "For Patients",
    links: [
      { label: "Find a Doctor", href: "/search" },
      { label: "Hospitals & Facilities", href: "/healthcare-institutions" },
      { label: "Order Medications", href: "/search?type=pharmacy" },
      { label: "Emergency Help & Triage", href: "/emergency" },
      { label: "Book Appointments", href: "/appointments" },
    ],
  },
  {
    title: "For Providers & Networks",
    links: [
      { label: "Register Doctor Profile", href: "/auth?tab=signup" },
      { label: "Enroll Hospital / Clinic", href: "/auth?tab=signup" },
      { label: "Provider Dashboard", href: "/provider-portal" },
      { label: "Tariffs & Pricing Plans", href: "/pricing" },
      { label: "Institutional Portal", href: "/institution-portal" },
    ],
  },
  {
    title: "Company & Trust",
    links: [
      { label: "About Platform", href: "/about" },
      { label: "Contact & Support", href: "/contact" },
      { label: "Documentation", href: "/documentation" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export const LandingFooter = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 transition-colors text-white">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <AppLogo size="sm" linkTo="/" className="text-white" />
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium max-w-sm">
              Zambia's trusted healthcare CRM & WorkOS platform uniting patients, doctors, pharmacies, NHIMA insurance claims, accounting, and hospital networks.
            </p>

            {/* Clinical WorkOS 3-dots Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#ff3d57]" />
              <span className="w-2 h-2 rounded-full bg-[#fdab3d]" />
              <span className="w-2 h-2 rounded-full bg-[#00c875]" />
              <span className="font-mono text-[#0073ea] font-black text-[11px] uppercase tracking-wider ml-1">
                Clinical WorkOS
              </span>
            </div>

            {/* Newsletter Subscription */}
            <form onSubmit={handleSubscribe} className="space-y-2 pt-2 max-w-sm">
              <span className="text-xs font-bold text-slate-300 block">Stay updated on clinical & claims releases</span>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="doctor@hospital.zm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0073ea]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0073ea] hover:bg-blue-600 font-black text-xs text-white shrink-0 transition-all"
                >
                  {subscribed ? "Subscribed!" : "Subscribe"}
                </button>
              </div>
            </form>
          </div>

          {/* 4 Directory Columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="col-span-1">
              <h4 className="text-xs font-black uppercase text-white mb-4 tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-slate-400 hover:text-white font-medium transition-colors block hover:translate-x-0.5"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar with Compliance & Country Badge */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} Doc' O Clock WorkOS Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>NHIMA & HPCZ Regulatory Certified</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="h-3.5 w-3.5 text-blue-400" />
              <span>256-Bit HIPAA/GDPR Grade Encryption</span>
            </span>
            <span className="font-bold text-slate-200">
              Proudly Made in Zambia 🇿🇲
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
