import { useNavigate } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { ArrowRight, Calendar, Phone, HeartPulse, ShieldCheck, Lock, Globe, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const BrowseSpecialties = () => {
  const navigate = useNavigate();
  return (
    <section className="vf-section bg-canvas-bone border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="vf-eyebrow mb-5">
            <Globe className="h-3.5 w-3.5 text-accent-500" />
            National Healthcare Directory
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-medium text-midnight tracking-tight">
            Browse medical specialties across Zambia
          </h2>
          <p className="text-base text-graphite-500 max-w-xl mx-auto mt-4 tracking-wide">
            Connect with certified doctors, dentists, and surgeons in Lusaka, Copperbelt, and nationwide.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
          {[
            "General Practice", "Dentistry", "Cardiology", "Pediatrics",
            "Gynecology & Obstetrics", "Dermatology", "Orthopedics",
            "Ophthalmology", "ENT / Ear, Nose, Throat", "Neurology",
            "Urology", "Psychiatry", "Radiology",
            "Pharmacy & Prescriptions", "Emergency Care",
          ].map((spec) => (
            <button
              key={spec}
              onClick={() => navigate(`/search?specialty=${encodeURIComponent(spec)}`)}
              className="px-4 py-2.5 rounded-pill bg-white border border-canvas-silk text-sm font-medium text-graphite-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              {spec}
            </button>
          ))}
        </div>
        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/search")}
            className="text-primary-500 hover:text-primary-600 font-medium text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            Explore all verified doctors, pharmacies & clinics
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="vf-section bg-white border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden p-8 sm:p-14 lg:p-16 rounded-card bg-midnight">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/15 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center lg:text-left max-w-2xl">
              <span className="vf-eyebrow !bg-white/10 !border-white/20 !text-white/90">
                Free forever for patients — no subscriptions
              </span>
              <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-medium text-white tracking-tight leading-[1.1]">
                Ready to take control of your health with Doc&apos; O Clock?
              </h2>
              <p className="text-base text-white/70 leading-relaxed tracking-wide">
                Book appointments with verified specialists, consult via encrypted video, and receive prescription medications delivered straight to your home.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-1">
                {["Free to book", "NHIMA Accepted", "500+ Doctors", "256-Bit Encrypted"].map((b) => (
                  <span key={b} className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-primary-300" />{b}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => navigate("/search")}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-pill bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm shadow-button transition-all"
              >
                <Calendar className="h-5 w-5" />
                Find Doctors & Book Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate("/video-dashboard")}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-pill bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-sm transition-all"
              >
                <Phone className="h-4 w-4" />
                Start Video Consult Now
              </button>
              <button
                onClick={() => navigate("/emergency")}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-pill bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium text-sm transition-all"
              >
                <HeartPulse className="h-4 w-4" />
                24/7 Emergency Triage & Hospital Finder
              </button>
            </div>
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
    if (email.trim()) { setSubscribed(true); setEmail(""); }
  };

  return (
    <footer className="border-t border-canvas-silk bg-canvas-bone text-graphite-800">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" linkTo="/" />
              <span className="font-display text-lg text-midnight">Doc&apos; O Clock</span>
            </div>
            <p className="text-sm text-graphite-500 leading-relaxed tracking-wide max-w-sm">
              Zambia&apos;s premier digital healthcare and telemedicine platform connecting patients with certified doctors, pharmacies, and hospitals.
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white border border-canvas-silk w-fit">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-soft-pulse" />
              <span className="text-xs font-medium text-graphite-700">24/7 Zambian Healthcare Network</span>
            </div>
            <form onSubmit={handleSubscribe} className="space-y-2 pt-1 max-w-sm">
              <span className="text-xs font-medium text-graphite-600 block">Get healthcare tips & updates</span>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="your@email.zm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-pill border border-canvas-silk bg-white text-xs text-midnight placeholder:text-graphite-400 focus:outline-none focus:border-primary-500"
                />
                <button type="submit" className="px-4 py-2.5 rounded-pill bg-primary-500 hover:bg-primary-600 font-medium text-xs text-white shrink-0 transition-all">
                  {subscribed ? "Done" : "Subscribe"}
                </button>
              </div>
            </form>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="col-span-1">
              <h4 className="text-xs font-medium uppercase text-midnight mb-4 tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-graphite-500 hover:text-primary-500 font-medium transition-colors block">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-canvas-silk flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-graphite-400 font-medium">
          <p>© {new Date().getFullYear()} Doc&apos; O Clock Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex items-center gap-1.5 text-success-500 font-medium">
              <ShieldCheck className="h-4 w-4" />
              NHIMA & Ministry of Health Aligned
            </span>
            <span className="flex items-center gap-1.5 text-graphite-500">
              <Lock className="h-3.5 w-3.5 text-primary-500" />
              256-Bit HIPAA-Grade Encryption
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
