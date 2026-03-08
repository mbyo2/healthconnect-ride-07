import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { ZAMBIAN_TESTIMONIALS } from "@/config/zambia";

export const Testimonials = () => (
  <section className="py-12 md:py-14 lg:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Testimonials</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Loved Across Zambia</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {ZAMBIAN_TESTIMONIALS.slice(0, 3).map((t, idx) => (
          <TestimonialCard key={idx} testimonial={t} />
        ))}
      </div>

      <div className="hidden lg:grid grid-cols-3 gap-6 max-w-5xl mx-auto mt-6">
        {ZAMBIAN_TESTIMONIALS.slice(3, 6).map((t, idx) => (
          <TestimonialCard key={idx} testimonial={t} />
        ))}
      </div>
    </div>
  </section>
);

const TestimonialCard = ({ testimonial: t }: { testimonial: typeof ZAMBIAN_TESTIMONIALS[number] }) => (
  <Card className="border-border/40 bg-card hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <Quote className="h-8 w-8 text-primary/20 mb-4" />
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.content}"</p>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {t.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="text-sm font-semibold">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.role} • {t.city}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);
