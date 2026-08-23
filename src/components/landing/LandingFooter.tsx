import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";
import { ArrowRight, Smartphone, ShieldCheck, CheckCircle2 } from "lucide-react";

export const BrowseSpecialties = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-[#f5f6f8] dark:bg-slate-950 border-t border-[#e6e9ef] dark:border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 mb-2">
            Specialty Catalog
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Browse Healthcare Specialties
          </h2>
          <p className="text-xs sm:text-sm text-[#676879] dark:text-slate-400 max-w-xl mx-auto font-medium mt-1">
            Access verified medical specialists across all 10 provinces of Zambia
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {[
            "General Practice", "Cardiology", "Dermatology", "Pediatrics",
            "Gynecology", "Orthopedics", "Psychiatry", "Dentistry",
            "Ophthalmology", "ENT", "Neurology", "Urology", "Radiology", "Oncology"
          ].map((specialty) => (
            <button
              key={specialty}
              onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
              className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-[#c3c6d4] dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-[#0073ea] hover:text-[#0073ea] transition-all shadow-2xs"
            >
              {specialty}
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/search")}
            className="text-[#0073ea] hover:underline font-extrabold text-xs inline-flex items-center gap-1"
          >
            <span>View all specialties and clinics</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-[#ffffff] dark:bg-slate-900 border-t border-[#e6e9ef] dark:border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-r from-[#0073ea] to-indigo-700 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold border border-white/30">
              Instant Access
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to Upgrade Your Healthcare Experience?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl font-medium">
              Join thousands of patients, doctors, and pharmacy operators leveraging Zambia's modern healthcare WorkOS.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/auth?tab=signup")}
              className="px-6 py-3 rounded-md bg-white text-[#0073ea] hover:bg-slate-100 font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => navigate("/search")}
              className="px-6 py-3 rounded-md bg-white/10 hover:bg-white/20 border border-white/30 text-white font-extrabold text-xs sm:text-sm transition-all"
            >
              Find Doctors
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

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
    title: "For Providers",
    links: [
      { label: "Join as Doctor", href: "/auth?tab=signup" },
      { label: "Register Hospital", href: "/auth?tab=signup" },
      { label: "WorkOS Telemetry", href: "/workos" },
      { label: "Tariffs & Pricing", href: "/pricing" },
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About Platform", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Documentation", href: "/documentation" },
    ]
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ]
  },
];

export const LandingFooter = () => (
  <footer className="border-t border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 transition-colors">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
        <div className="col-span-2 md:col-span-1 space-y-3">
          <AppLogo size="sm" linkTo="/" />
          <p className="text-xs text-[#676879] dark:text-slate-400 leading-relaxed font-medium">
            Zambia's trusted healthcare platform for patients, doctors, pharmacies, and hospital networks.
          </p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title}>
            <h4 className="text-xs font-extrabold uppercase text-slate-900 dark:text-slate-100 mb-3">{section.title}</h4>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-xs text-[#676879] dark:text-slate-400 hover:text-[#0073ea] font-medium transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-[#e6e9ef] dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-[#676879] dark:text-slate-400 font-medium">
        <p>© {new Date().getFullYear()} Doc' O Clock WorkOS. All rights reserved.</p>
        <p className="flex items-center gap-1">
          <span>NHIMA & Ministry of Health Aligned • Made with ❤️ in Zambia 🇿🇲</span>
        </p>
      </div>
    </div>
  </footer>
);
