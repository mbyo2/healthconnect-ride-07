import { Card, CardContent } from "@/components/ui/card";
import { Quote, Star, CheckCircle2 } from "lucide-react";
import { ZAMBIAN_TESTIMONIALS } from "@/config/zambia";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

export const Testimonials = () => {
  const stats = usePlatformStats();

  return (
    <section className="py-16 bg-[#ffffff] dark:bg-slate-900 border-t border-[#e6e9ef] dark:border-slate-800 transition-colors">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-2">
            Verified Reviews
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Trusted by {formatStat(stats.patients)} Zambians
          </h2>
          <p className="text-xs sm:text-sm text-[#676879] dark:text-slate-400 max-w-xl mx-auto font-medium mt-1">
            Real experiences from patients, doctors, and pharmacy operators across Lusaka, Copperbelt, and Southern Province.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {ZAMBIAN_TESTIMONIALS.slice(0, 6).map((t, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#f5f6f8] dark:bg-slate-950 border border-[#e6e9ef] dark:border-slate-800 hover:border-[#0073ea] transition-all space-y-3 shadow-2xs"
            >
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

              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                "{t.content}"
              </p>

              <div className="pt-3 border-t border-[#e6e9ef] dark:border-slate-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#0073ea] text-white flex items-center justify-center font-bold text-xs">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{t.name}</div>
                  <div className="text-[10px] text-[#676879] dark:text-slate-400">{t.role} • {t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
