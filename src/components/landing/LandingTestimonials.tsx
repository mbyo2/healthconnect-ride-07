import { Star, Quote, ThumbsUp, Award, TrendingUp, HeartPulse, ShieldCheck } from "lucide-react";
import { ZAMBIAN_TESTIMONIALS } from "@/config/zambia";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

const PARTNERS = [
  { name: "UTH Lusaka", fullName: "University Teaching Hospital", abbr: "UTH" },
  { name: "CIMA Healthcare", fullName: "CIMA Medical Network", abbr: "CI" },
  { name: "Ministry of Health", fullName: "MoH Republic of Zambia", abbr: "MoH" },
  { name: "Medland Hospital", fullName: "Specialist Medical Center", abbr: "ML" },
  { name: "NHIMA Zambia", fullName: "National Health Insurance Authority", abbr: "NH" },
  { name: "Fairview Hospital", fullName: "Healthcare Services Lusaka", abbr: "FV" },
];

const METRICS = [
  { value: "500+", label: "Verified Doctors", detail: "Across 20+ clinical specialties", icon: Award },
  { value: "98.4%", label: "Patient Satisfaction", detail: "Rated 4.9/5 across 50,000+ consults", icon: HeartPulse },
  { value: "< 15m", label: "Average Video Wait", detail: "Direct connection with on-call doctor", icon: TrendingUp },
  { value: "100%", label: "NHIMA Accepted", detail: "Digital eligibility & claim verification", icon: ShieldCheck },
];

export const Testimonials = () => {
  const stats = usePlatformStats();

  return (
    <section className="vf-section bg-white border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-16">
          {METRICS.map((m) => (
            <div key={m.label} className="vf-card space-y-3">
              <div className="p-2.5 rounded-2xl bg-primary-50 w-fit border border-primary-100">
                <m.icon className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <div className="font-display text-3xl sm:text-4xl font-medium text-midnight">{m.value}</div>
                <div className="text-xs sm:text-sm text-midnight font-medium mt-1">{m.label}</div>
                <div className="text-[11px] text-graphite-500 mt-0.5 leading-snug tracking-wide">{m.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-graphite-400">
            Trusted by Zambia&apos;s Leading Healthcare Networks & Hospitals
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className="px-4 py-3 rounded-card bg-white border border-canvas-silk flex items-center gap-3 hover:border-primary-200 hover:shadow-card transition-all"
            >
              <div className="h-8 w-8 rounded-xl bg-primary-500 flex items-center justify-center text-white font-medium text-xs">
                {p.abbr[0]}
              </div>
              <div className="text-left">
                <span className="text-xs font-medium text-midnight block">{p.name}</span>
                <span className="text-[10px] text-graphite-400 block">{p.fullName}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="vf-eyebrow mb-5">
            <ThumbsUp className="h-3.5 w-3.5 text-accent-500" />
            Verified Patient Reviews
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-medium text-midnight tracking-tight">
            Loved by {formatStat(stats.patients)} Zambian patients
          </h2>
          <p className="text-base text-graphite-500 max-w-xl mx-auto font-normal mt-4 leading-relaxed tracking-wide">
            Real experiences from patients booking appointments in Lusaka, Ndola, Kitwe, and across Zambia.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {ZAMBIAN_TESTIMONIALS.slice(0, 6).map((t, idx) => (
            <div key={idx} className="vf-card flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-pill text-[10px] font-medium bg-success-50 text-success-500">
                    Verified Patient
                  </span>
                </div>
                <div className="relative pt-1">
                  <Quote className="h-5 w-5 text-canvas-silk absolute -top-1 -left-1" />
                  <p className="text-sm text-graphite-600 leading-relaxed pl-4 tracking-wide">
                    &ldquo;{t.content}&rdquo;
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-canvas-mist flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-medium text-xs shrink-0">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="font-medium text-sm text-midnight group-hover:text-primary-500 transition-colors">{t.name}</div>
                  <div className="text-[11px] text-graphite-400">{t.role} · {t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-5 px-8 py-5 rounded-card bg-canvas-bone border border-canvas-silk">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <div className="text-center sm:text-left">
              <div className="font-medium text-midnight text-sm sm:text-base">4.9 / 5.0 Rating Across All App Stores</div>
              <div className="text-xs text-graphite-400">Over {formatStat(stats.patients)} verified Zambian consultations</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
