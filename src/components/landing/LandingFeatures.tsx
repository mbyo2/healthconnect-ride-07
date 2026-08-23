import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search, Calendar, Video, Shield, Zap, Building2,
  ChevronRight, Star, CheckCircle, ArrowRight, Activity, Pill, UserCheck
} from "lucide-react";

export const CareExperience = () => (
  <section className="py-16 bg-[#ffffff] dark:bg-slate-900 border-t border-[#e6e9ef] dark:border-slate-800 transition-colors">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <Activity className="h-3.5 w-3.5" />
            <span>Connected Healthcare WorkOS</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            One Unified Care Journey, <br />
            <span className="text-[#0073ea]">Engineered for Simplicity.</span>
          </h2>
          <p className="text-sm text-[#676879] dark:text-slate-400 leading-relaxed font-medium">
            Seamlessly navigate between searching verified specialists, locking in appointment slots, managing pharmacy orders, and tracking vitals.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875] mb-2">
                Verified
              </span>
              <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">In-Person & Telehealth</div>
              <div className="text-xs text-[#676879] dark:text-slate-400 mt-0.5">Real-time doctor calendar availability</div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#579bfc] mb-2">
                Automated
              </span>
              <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Digital Prescriptions</div>
              <div className="text-xs text-[#676879] dark:text-slate-400 mt-0.5">Direct dispatch to local pharmacies</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950 p-4 shadow-sm">
          <div className="rounded-xl overflow-hidden border border-[#c3c6d4] dark:border-slate-800 relative">
            <img
              src="https://images.unsplash.com/photo-1758691462743-f9fc9e430d39?auto=format&fit=crop&w=1200&q=85"
              alt="Telehealth consult"
              className="h-64 w-full object-cover"
            />
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-[#e6e9ef] dark:border-slate-800 backdrop-blur-sm flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Lusaka Central Clinic</div>
                <div className="text-[11px] text-[#676879] dark:text-slate-400">Dr. Sarah Jenkins • HD Teleconsult Active</div>
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

export const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-[#f5f6f8] dark:bg-slate-950 border-t border-[#e6e9ef] dark:border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 mb-2">
            Structured Workflow
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Book Care in 4 Precise Steps
          </h2>
          <p className="text-xs sm:text-sm text-[#676879] dark:text-slate-400 max-w-xl mx-auto font-medium mt-1">
            Standardized intake flow designed for zero friction
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Search", desc: "Filter by specialty, insurance, and city", icon: Search, route: "/search", statusTag: "Instant Search", color: "bg-[#0073ea]" },
            { step: "02", title: "Compare", desc: "Inspect verified ratings & consultation fees", icon: Star, route: "/providers", statusTag: "Ratings Verified", color: "bg-[#a25ddc]" },
            { step: "03", title: "Book", desc: "Select time slot and confirm instantly", icon: Calendar, route: "/appointments", statusTag: "Auto-Confirmed", color: "bg-[#00c875]" },
            { step: "04", title: "Consult", desc: "In-person visit or HD Video consultation", icon: Video, route: "/video-dashboard", statusTag: "HD Encrypted", color: "bg-[#fdab3d]" },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => navigate(item.route)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 hover:border-[#0073ea] transition-all cursor-pointer space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">STEP {item.step}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${item.color}`}>
                  {item.statusTag}
                </span>
              </div>

              <div className="h-10 w-10 rounded-xl bg-[#f0f2f7] dark:bg-slate-800 flex items-center justify-center text-[#0073ea]">
                <item.icon className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{item.title}</h3>
                <p className="text-xs text-[#676879] dark:text-slate-400 font-medium mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const Features = () => (
  <section className="py-16 bg-[#ffffff] dark:bg-slate-900 border-t border-[#e6e9ef] dark:border-slate-800 transition-colors">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20 mb-2">
          Integrated Modules
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Comprehensive Healthcare Infrastructure
        </h2>
        <p className="text-xs sm:text-sm text-[#676879] dark:text-slate-400 max-w-xl mx-auto font-medium mt-1">
          Everything patients, doctors, pharmacies, and hospital administrators need
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Search, title: "Smart Provider Directory", desc: "Search verified doctors by specialty, location, and accepted insurance.", badge: "Real-time" },
          { icon: Calendar, title: "Automated Scheduling", desc: "Instant online appointment confirmations with calendar reminders.", badge: "24/7 Available" },
          { icon: Video, title: "HD Video Consultations", desc: "Browser-based video visits with screen share & digital chart notes.", badge: "Encrypted" },
          { icon: Shield, title: "NHIMA & Insurance Verified", desc: "Automated eligibility checking before appointment confirmation.", badge: "Verified" },
          { icon: Zap, title: "E-Prescriptions & Pharmacy POS", desc: "Direct electronic prescription dispatches to local pharmacies.", badge: "Auto-Fulfill" },
          { icon: Building2, title: "Hospital Operations Suite", desc: "Full EMR, bed occupancy, ICU telemetry, and billing management.", badge: "WorkOS HMS" },
        ].map((f, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-[#f5f6f8] dark:bg-slate-950 border border-[#e6e9ef] dark:border-slate-800 hover:border-[#0073ea] transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 flex items-center justify-center text-[#0073ea]">
                <f.icon className="h-4 w-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00c875] text-white">
                {f.badge}
              </span>
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{f.title}</h3>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium mt-1 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const ForProviders = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-[#f5f6f8] dark:bg-slate-950 border-t border-[#e6e9ef] dark:border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
              For Healthcare Professionals & Clinics
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              Power Your Clinical Practice <br />
              <span className="text-[#0073ea]">With Doc' O Clock WorkOS</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#676879] dark:text-slate-400 leading-relaxed font-medium">
              Empower your clinic, pharmacy, or hospital with modern operational tools to manage patient appointments, digital charts, inventory, and billing revenue.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { title: "Zero Upfront Platform Cost", desc: "No hidden setup fees — pay only on confirmed bookings." },
                { title: "Complete EMR & Billing Suite", desc: "Track patient history, write prescriptions, and invoice insurance." },
                { title: "Telehealth HD Video Suite", desc: "Reach patients across all provinces in Zambia directly." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800">
                  <CheckCircle className="h-4 w-4 text-[#00c875] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{item.title}</div>
                    <div className="text-[11px] text-[#676879] dark:text-slate-400">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => navigate("/auth?tab=signup")}
                className="px-5 py-2.5 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Register Practice</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => navigate("/pricing")}
                className="px-5 py-2.5 rounded-md bg-white dark:bg-slate-900 border border-[#c3c6d4] dark:border-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs hover:bg-[#f0f2f7] transition-all"
              >
                View Tariff Rates
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e9ef] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#0073ea]" />
                <h3 className="font-extrabold text-sm">Provider Telemetry Overview</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">
                Live Board
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#f5f6f8] dark:bg-slate-950 border border-[#e6e9ef] dark:border-slate-800">
                <div className="text-[11px] text-[#676879] font-bold uppercase">Today's Visits</div>
                <div className="text-2xl font-black font-mono text-[#0073ea] mt-1">18</div>
                <div className="text-[10px] text-emerald-500 font-bold mt-1">+4 via Telehealth</div>
              </div>

              <div className="p-3 rounded-xl bg-[#f5f6f8] dark:bg-slate-950 border border-[#e6e9ef] dark:border-slate-800">
                <div className="text-[11px] text-[#676879] font-bold uppercase">Weekly Revenue</div>
                <div className="text-2xl font-black font-mono text-emerald-600 mt-1">K24,500</div>
                <div className="text-[10px] text-emerald-500 font-bold mt-1">+12% vs last week</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
