import { Card, CardContent } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";
import { ZAMBIAN_TESTIMONIALS } from "@/config/zambia";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

export const Testimonials = () => {
  const stats = usePlatformStats();

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--primary),0.08),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4 border border-primary/20">
            <Star className="h-3.5 w-3.5 fill-primary" />
            Trusted by Thousands
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Loved by {formatStat(stats.patients)} Users
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            See what Zambians are saying about their healthcare experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {ZAMBIAN_TESTIMONIALS.slice(0, 3).map((t, idx) => (
            <TestimonialCard key={idx} testimonial={t} index={idx} />
          ))}
        </div>

        <div className="hidden lg:grid grid-cols-3 gap-6 max-w-6xl mx-auto mt-6">
          {ZAMBIAN_TESTIMONIALS.slice(3, 6).map((t, idx) => (
            <TestimonialCard key={idx} testimonial={t} index={idx + 3} />
          ))}
        </div>
      </div>
    </section>
  );
};

const TestimonialCard = ({ testimonial: t, index }: { testimonial: typeof ZAMBIAN_TESTIMONIALS[number], index: number }) => {
  const gradients = [
    "from-blue-500/10 to-blue-500/5",
    "from-purple-500/10 to-purple-500/5",
    "from-emerald-500/10 to-emerald-500/5",
    "from-amber-500/10 to-amber-500/5",
    "from-rose-500/10 to-rose-500/5",
    "from-cyan-500/10 to-cyan-500/5",
  ];
  
  return (
    <Card className={`border-border/40 bg-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 group overflow-hidden relative`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <CardContent className="p-8 relative">
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 text-primary fill-primary" />
          ))}
        </div>
        <Quote className="h-10 w-10 text-primary/20 mb-4 group-hover:text-primary/40 transition-colors" />
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.content}"</p>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary border border-primary/20 group-hover:scale-110 transition-transform">
            {t.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="font-semibold">{t.name}</div>
            <div className="text-xs text-muted-foreground">{t.role} • {t.city}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
