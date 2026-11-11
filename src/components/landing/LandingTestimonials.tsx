import { Award, TrendingUp, HeartPulse, ShieldCheck } from "lucide-react";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

// Facility segments the platform serves — not claimed partnerships.
const ECOSYSTEM = [
  { name: "Teaching Hospitals", fullName: "Tertiary & referral care", abbr: "TH" },
  { name: "Clinics", fullName: "Primary care practices", abbr: "CL" },
  { name: "Pharmacies", fullName: "Retail & hospital dispensaries", abbr: "PH" },
  { name: "Laboratories", fullName: "Diagnostics & imaging", abbr: "LB" },
  { name: "NHIMA Cover", fullName: "Insurance eligibility checks", abbr: "NH" },
  { name: "Emergency Care", fullName: "Triage & ambulance dispatch", abbr: "ER" },
];

export const Testimonials = () => {
  const stats = usePlatformStats();

  // Live platform counts — unknown/zero values are filtered out, never faked.
  const metrics = [
    { value: formatStat(stats.doctors), label: "Verified Providers", detail: "Doctors, nurses & clinical cadres", icon: Award },
    { value: formatStat(stats.hospitals), label: "Care Facilities", detail: "Hospitals & clinics on platform", icon: HeartPulse },
    { value: formatStat(stats.appointments), label: "Appointments", detail: "Booked through the platform", icon: TrendingUp },
    { value: formatStat(stats.pharmacies), label: "Pharmacies", detail: "Dispensaries & drug stores", icon: ShieldCheck },
  ].filter((m) => m.value !== null);

  return (
    <section className="vf-section bg-white dark:bg-slate-900 border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        {metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-16">
          {metrics.map((m) => (
            <div key={m.label} className="vf-card space-y-3">
              <div className="p-2.5 rounded-2xl bg-primary-50 w-fit border border-primary-100">
                <m.icon className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <div className="font-display text-3xl sm:text-4xl font-medium text-midnight">{m.value}</div>
                <div className="text-xs sm:text-sm text-midnight font-medium mt-1">{m.label}</div>
                <div className="text-xs text-graphite-500 dark:text-slate-400 mt-0.5 leading-snug tracking-wide">{m.detail}</div>
              </div>
            </div>
          ))}
        </div>
        )}

        <div className="text-center mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-graphite-400">
            Built for every corner of Zambia&apos;s healthcare ecosystem
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {ECOSYSTEM.map((p) => (
            <div
              key={p.name}
              className="px-4 py-3 rounded-card bg-white dark:bg-slate-900 border border-canvas-silk flex items-center gap-3 hover:border-primary-200 hover:shadow-card transition-all"
            >
              <div className="h-8 w-8 rounded-xl bg-primary-500 flex items-center justify-center text-white font-medium text-xs">
                {p.abbr[0]}
              </div>
              <div className="text-left">
                <span className="text-xs font-medium text-midnight block">{p.name}</span>
                <span className="text-xs text-graphite-400 block">{p.fullName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
