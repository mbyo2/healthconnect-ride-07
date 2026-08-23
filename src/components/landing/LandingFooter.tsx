import { useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { ArrowRight, Sparkles, CheckCircle2, Zap, Shield, Globe } from "lucide-react";

/* ─── Browse Specialties ─── */
export const BrowseSpecialties = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-slate-950 border-t border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 mb-3">
            Specialty Catalog
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Browse Healthcare Specialties
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium mt-2">
            Access verified medical specialists across all 10 provinces of Zambia
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
          {[
            "General Practice", "Cardiology", "Dermatology", "Pediatrics",
            "Gynecology", "Orthopedics", "Psychiatry", "Dentistry",
            "Ophthalmology", "ENT", "Neurology", "Urology", "Radiology", "Oncology"
          ].map((specialty) => (
            <button
              key={specialty}
              onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
              className="px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:border-[#0073ea] hover:text-white hover:bg-slate-800 transition-all shadow-sm"
            >
              {specialty}
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/search")}
            className="text-[#0073ea] hover:text-blue-300 font-extrabold text-xs inline-flex items-center gap-1 transition-colors"
          >
            <span>View all specialties and clinics</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

/* ─── CTA Section ─── */
export const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-slate-900 border-t border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950/40 to-indigo-950/60 border border-slate-800 shadow-2xl">
          {/* Glow blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center md:text-left max-w-xl">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">
                ✨ Instant Access — No Credit Card Required
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Ready to run your clinical operations like a CRM?
              </h2>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                Join thousands of patients, doctors, and pharmacy operators leveraging Zambia's most advanced healthcare WorkOS — powered by monday.com-style boards.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {["Free to start", "No setup fees", "NHIMA Compliant"].map((badge) => (
                  <span key={badge} className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={() => navigate("/auth?tab=signup")}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-[#0073ea] via-indigo-600 to-[#a25ddc] text-white font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => navigate("/workos")}
                className="px-8 py-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Open WorkOS Demo Board</span>
              </button>

              <button
                onClick={() => navigate("/search")}
                className="px-8 py-4 rounded-full border border-slate-700 hover:border-slate-500 text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Globe className="h-4 w-4 text-blue-400" />
                <span>Find a Doctor</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Footer ─── */
const FOOTER_SECTIONS = [
  {
    title: "For Patients",
    links: [
      { label: "Find a Doctor", href: "/search" },
      { label: "Hospitals", href: "/healthcare-institutions" },
      { label: "Pharmacies", href: "/search?type=pharmacy" },
      { label: "Emergency Help", href: "/emergency" },
    ]
  },
  {
    title: "WorkOS CRM",
    links: [
      { label: "Patient Triage Board", href: "/workos" },
      { label: "Kanban Cards View", href: "/workos" },
      { label: "Clinical Funnel", href: "/workos" },
      { label: "AI Copilot", href: "/workos" },
    ]
  },
  {
    title: "For Providers",
    links: [
      { label: "Join as Doctor", href: "/auth?tab=signup" },
      { label: "Register Hospital", href: "/auth?tab=signup" },
      { label: "Provider Dashboard", href: "/provider-portal" },
      { label: "Tariffs & Pricing", href: "/pricing" },
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About Platform", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Documentation", href: "/documentation" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ]
  },
];

export const LandingFooter = () => {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-slate-800 bg-slate-950 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <AppLogo size="sm" linkTo="/" className="text-white" />
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Zambia's trusted healthcare CRM & WorkOS platform for patients, doctors, pharmacies, and hospital networks.
            </p>
            {/* Monday-style dots badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d57]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#fdab3d]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c875]" />
              <span className="font-mono text-[#0073ea] font-black text-[10px] uppercase ml-1">monday CRM</span>
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-black uppercase text-white mb-4 tracking-wider">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-slate-400 hover:text-white font-medium transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Doc' O Clock WorkOS. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              NHIMA & Ministry of Health Aligned
            </span>
            <span>Made with ❤️ in Zambia 🇿🇲</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
