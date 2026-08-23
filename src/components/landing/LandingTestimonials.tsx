import { Star, Quote, CheckCircle2, Award, TrendingUp, HeartPulse, ShieldCheck } from "lucide-react";
import { ZAMBIAN_TESTIMONIALS } from "@/config/zambia";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

/* ─── Partner Logo Wall ─── */
const PARTNERS = [
  { name: "UTH Lusaka", abbr: "UTH" },
  { name: "CIMA Healthcare", abbr: "CIMA" },
  { name: "Ministry of Health", abbr: "MoH" },
  { name: "MedGemma AI", abbr: "MGA" },
  { name: "NHIMA Zambia", abbr: "NHIMA" },
  { name: "USAID Health", abbr: "USAID" },
];

/* ─── Impact Metrics ─── */
const METRICS = [
  { value: "+45%", label: "Triage velocity improvement", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "98.4%", label: "Patient satisfaction score", icon: HeartPulse, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  { value: "< 12m", label: "Average intake time", icon: Award, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "100%", label: "NHIMA compliance rate", icon: ShieldCheck, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
];

export const Testimonials = () => {
  const stats = usePlatformStats();

  return (
    <section className="py-20 bg-slate-900 border-t border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">

        {/* Impact Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {METRICS.map((m) => (
            <div key={m.label} className={`p-5 rounded-2xl bg-slate-950 border ${m.bg} flex items-start gap-4`}>
              <div className={`p-2.5 rounded-xl ${m.bg} border`}>
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <div>
                <div className={`text-3xl font-black font-mono ${m.color}`}>{m.value}</div>
                <div className="text-xs text-slate-400 font-medium mt-1 leading-snug">{m.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Logos Wall */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Trusted by leading Zambian healthcare institutions
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className="px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 hover:border-slate-600 transition-all"
            >
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#0073ea] to-[#a25ddc] flex items-center justify-center text-white font-black text-[10px]">
                {p.abbr[0]}
              </div>
              <span className="text-xs font-bold text-slate-300">{p.name}</span>
            </div>
          ))}
        </div>

        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-3">
            Verified Reviews
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Trusted by {formatStat(stats.patients)} Zambians
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium mt-2">
            Real experiences from patients, doctors, and pharmacy operators across Lusaka, Copperbelt, and Southern Province.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {ZAMBIAN_TESTIMONIALS.slice(0, 6).map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 transition-all space-y-4 group"
            >
              {/* Stars & Badge */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c875]">
                  Verified User
                </span>
              </div>

              {/* Quote */}
              <div className="relative">
                <Quote className="h-5 w-5 text-slate-700 absolute -top-1 -left-1" />
                <p className="text-sm text-slate-300 font-medium leading-relaxed pl-4">
                  "{t.content}"
                </p>
              </div>

              {/* Author */}
              <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0073ea] to-[#a25ddc] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-white">{t.name}</div>
                  <div className="text-[11px] text-slate-400">{t.role} • {t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* G2 Rating Badge */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <div>
              <div className="font-black text-white text-sm">4.9 / 5.0 on G2</div>
              <div className="text-[11px] text-slate-400">Based on {formatStat(stats.patients)} verified reviews</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center font-black text-white text-sm">
              G2
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
