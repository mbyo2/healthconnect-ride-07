import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, CheckCircle, MapPin, Phone, CreditCard } from 'lucide-react';
import { usePlatformStats, formatStat } from '@/hooks/usePlatformStats';

export const CtaSection = () => {
  const stats = usePlatformStats();

  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent)]" />

      <div className="container-modern relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-primary-foreground/15 rounded-2xl backdrop-blur-sm">
              <Shield className="h-8 w-8" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight tracking-tight">
            Your Health, Simplified
          </h2>

          <p className="text-base md:text-lg mb-8 opacity-85 leading-relaxed max-w-xl mx-auto">
            Join {formatStat(stats.patients)} users who trust Doc' O Clock for quality healthcare.
          </p>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8 text-sm">
            {[
              { icon: CheckCircle, label: "Free to start" },
              { icon: CreditCard, label: "Flexible payments" },
              { icon: MapPin, label: "Growing worldwide" },
              { icon: Phone, label: "24/7 Emergency" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 opacity-85">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-10">
            <Button asChild variant="secondary" size="xl" className="shadow-lg">
              <Link to="/auth?tab=signup" className="flex items-center gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="xl"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
            {[
              { value: formatStat(stats.doctors), label: "Doctors" },
              { value: formatStat(stats.hospitals), label: "Hospitals" },
              { value: formatStat(stats.pharmacies), label: "Pharmacies" },
              { value: `${stats.rating}★`, label: "Rating" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg md:text-2xl font-bold">{stat.value}</div>
                <div className="text-xs opacity-70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
