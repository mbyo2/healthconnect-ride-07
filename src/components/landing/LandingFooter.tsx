import { useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { ArrowRight, Sparkles, CheckCircle2, Shield, Globe, Lock, Phone, Calendar, HeartPulse, ShieldCheck, MapPin } from "lucide-react";
import { useState } from "react";

/* ─── Browse Specialties Catalog ─── */
export const BrowseSpecialties = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-[#090d18] border-t border-slate-800/80 transition-colors">
      <div className="mx-auto max-w-[1450px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-sky-400 text-xs font-black border border-blue-500/20 mb-3 shadow-inner">
            <Globe className="h-3.5 w-3.5 text-sky-400" />
            <span>National Healthcare Directory</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Browse Medical Specialties Across Zambia
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium mt-2 leading-relaxed">
            Connect with certified doctors, pediatricians, dentists, and surgeons in Lusaka, Copperbelt, and nationwide.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
          {[
            "General Practice",
            "Dentistry",
            "Cardiology",
            "Pediatrics",
            "Gynecology & Obstetrics",
            "Dermatology",
            "Orthopedics",
            "Ophthalmology",
            "ENT / Ear, Nose, Throat",
            "Neurology",
            "Urology",
            "Psychiatry",
            "Radiology",
            "Pharmacy & Prescriptions",
            "Emergency Care",
          ].map((specialty) => (
            <button
              key={specialty}
              onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
              className="px-4 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-xs sm:text-sm font-bold text-slate-300 hover:border-blue-500 hover:text-white hover:bg-slate-800 hover:scale-105 transition-all shadow-sm"
            >
              {specialty}
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/search")}
            className="text-sky-400 hover:text-sky-300 font-black text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Explore all verified doctors, pharmacies & clinics</span>
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
        <div className="relative overflow-hidden p-8 sm:p-14 lg:p-16 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0d142b] to-[#121b3a] border border-slate-800 shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center lg:text-left max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-black border border-white/20 shadow-inner">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>✨ Free Forever for Patients — No Subscriptions</span>
              </span>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                Ready to take control of your health with Doc' O Clock?
              </h2>

              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                Book appointments with verified specialists, consult via encrypted video, and receive prescription medications delivered straight to your home.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                {[
                  "Free to book",
                  "NHIMA Accepted",
                  "500+ Verified Doctors",
                  "256-Bit Encrypted",
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
                onClick={() => navigate("/search")}
                className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm sm:text-base shadow-2xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                <span>Find Doctors & Book Now</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={() => navigate("/video-dashboard")}
                className="px-8 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4 text-sky-400" />
                <span>Start Video Consult Now</span>
              </button>

              <button
                onClick={() => navigate("/emergency")}
                className="px-8 py-3.5 rounded-full border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <HeartPulse className="h-4 w-4 text-rose-400" />
                <span>24/7 Emergency Triage & Hospital Finder</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Clean Doc' O Clock Footer ─── */
const FOOTER_SECTIONS = [
  {
    title: "For Patients",
    links: [
      { label: "Find a Doctor", href: "/search" },
      { label: "Book Appointment", href: "/search" },
      { label: "Video Consultations", href: "/video-dashboard" },
      { label: "Order Medications", href: "/search?type=pharmacy" },
      { label: "Emergency Help & ER", href: "/emergency" },
    ],
  },
  {
    title: "Specialties",
    links: [
      { label: "General Practice", href: "/search?specialty=General+Practice" },
      { label: "Dentistry", href: "/search?specialty=Dentistry" },
      { label: "Cardiology", href: "/search?specialty=Cardiology" },
      { label: "Pediatrics", href: "/search?specialty=Pediatrics" },
      { label: "Gynecology", href: "/search?specialty=Gynecology" },
    ],
  },
  {
    title: "For Providers",
    links: [
      { label: "Join as Doctor", href: "/auth?tab=signup" },
      { label: "Register Clinic / Hospital", href: "/auth?tab=signup" },
      { label: "Pharmacy Partner Portal", href: "/pharmacy-portal" },
      { label: "Provider Dashboard", href: "/provider-portal" },
      { label: "Pricing & Tariffs", href: "/pricing" },
    ],
  },
  {
    title: "Doc' O Clock",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact & Support", href: "/contact" },
      { label: "Help & FAQs", href: "/documentation" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export const LandingFooter = () => {
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
              Zambia's premier digital healthcare and telemedicine platform connecting patients with certified doctors, pharmacies, and hospitals.
            </p>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">
                24/7 Zambian Healthcare Network
              </span>
            </div>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="space-y-2 pt-2 max-w-sm">
              <span className="text-xs font-bold text-slate-300 block">Get healthcare tips & updates</span>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="your.email@example.zm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-black text-xs text-white shrink-0 transition-all"
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

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} Doc' O Clock Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>NHIMA & Ministry of Health Aligned</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="h-3.5 w-3.5 text-blue-400" />
              <span>256-Bit HIPAA-Grade Encryption</span>
            </span>
            <span className="font-bold text-slate-200">
              Made with ❤️ in Zambia 🇿🇲
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
