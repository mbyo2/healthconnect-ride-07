import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { BadgeCheck, Building2, CalendarCheck, Pill, Search, Star, Stethoscope, Video } from "lucide-react";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

export const LandingHero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const stats = usePlatformStats();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
  };

  return (
    <section className="relative overflow-hidden pb-12 pt-24 md:pb-16 md:pt-28 lg:pb-20 lg:pt-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_75%_0%,hsl(var(--primary)/0.14),transparent)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div className="max-w-2xl text-center lg:text-left">
            <h1 className="mb-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              The right care, <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">right on time.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:mx-0">
              Find a trusted provider, see real availability, and book an in-person or video visit in minutes.
            </p>

            <form onSubmit={handleSearch} className="mx-auto mb-6 max-w-xl lg:mx-0">
              <div className="flex gap-2 rounded-2xl border border-border/60 bg-card p-1.5 shadow-xl shadow-primary/10">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="text" placeholder="Doctor, specialty, or condition" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0" />
                </div>
                <Button type="submit" className="h-11 rounded-xl px-6">Search</Button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {["General Practice", "Cardiology", "Pediatrics", "Dentistry", "Gynecology"].map((specialty) => (
                <Button key={specialty} variant="outline" size="sm" className="h-8 rounded-full border-border/50 text-xs hover:border-primary/30 hover:bg-primary/5 hover:text-primary" onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}>
                  {specialty}
                </Button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> Verified providers</span>
              <span className="inline-flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> Book online</span>
              <span className="inline-flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Video visits</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card p-2 shadow-2xl shadow-primary/15">
              <img src="https://images.unsplash.com/photo-1536064479547-7ee40b74b807?auto=format&fit=crop&w=1200&q=85" alt="Black African healthcare professional consulting with a young patient" className="h-[390px] w-full rounded-[1.35rem] object-cover sm:h-[470px]" />
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/30 bg-background/95 p-4 shadow-lg backdrop-blur sm:inset-x-8 sm:bottom-8">
                <div className="flex items-center gap-3">
                  <img src="https://images.unsplash.com/photo-1666886573681-a8fbe983a3fd?auto=format&fit=crop&w=160&q=80" alt="Black African healthcare professional" className="h-11 w-11 rounded-full object-cover" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Care that fits your life</p><p className="text-xs text-muted-foreground">Clinics, hospitals, specialists, and pharmacy care</p></div>
                  <Video className="h-5 w-5 shrink-0 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[
            { value: formatStat(stats.doctors), label: "Verified Doctors", icon: Stethoscope },
            { value: formatStat(stats.hospitals), label: "Partner Hospitals", icon: Building2 },
            { value: formatStat(stats.pharmacies), label: "Pharmacies", icon: Pill },
            { value: `${stats.rating}★`, label: "Average Rating", icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/40 bg-card p-4 text-center shadow-sm md:p-5"><stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" /><div className="text-2xl font-bold">{stat.value}</div><div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div></div>
          ))}
        </div>
      </div>
    </section>
  );
};
