import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { BadgeCheck, Building2, CalendarCheck, Pill, Search, Star, Stethoscope, Video, ArrowRight } from "lucide-react";
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
    <section className="relative overflow-hidden pb-16 pt-24 md:pb-20 md:pt-32 lg:pb-24 lg:pt-40">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="max-w-2xl text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6 border border-primary/20">
              <BadgeCheck className="h-3.5 w-3.5" />
              Zambia's #1 Healthcare Platform
            </div>
            <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              The right care, <br />
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">right on time.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:mx-0">
              Find a trusted provider, see real availability, and book an in-person or video visit in minutes.
            </p>

            <form onSubmit={handleSearch} className="mx-auto mb-8 max-w-xl lg:mx-0">
              <div className="flex gap-2 rounded-3xl border border-border/60 bg-card p-2 shadow-card">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="text" placeholder="Doctor, specialty, or condition" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 border-0 bg-transparent pl-11 shadow-none focus-visible:ring-0 text-base" />
                </div>
                <Button type="submit" className="h-12 rounded-full px-8 font-semibold">Search</Button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-2 lg:justify-start mb-8">
              {["General Practice", "Cardiology", "Pediatrics", "Dentistry", "Gynecology"].map((specialty) => (
                <Button key={specialty} variant="outline" size="sm" className="h-9 rounded-full border-border/50 text-xs hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all" onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}>
                  {specialty}
                </Button>
              ))}
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 lg:justify-start">
              {[
                { icon: BadgeCheck, text: "Verified providers" },
                { icon: CalendarCheck, text: "Book online" },
                { icon: Video, text: "Video visits" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg animate-scale-in">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card p-3 shadow-card">
              <div className="relative rounded-[1.75rem] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1666886573440-16ac24f89e31?auto=format&fit=crop&w=1200&q=85" alt="Black healthcare professional and patient reviewing care together" className="h-[400px] w-full object-cover sm:h-[500px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
              <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/20 bg-background/95 p-5 shadow-card backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1666886573681-a8fbe983a3fd?auto=format&fit=crop&w=160&q=80" alt="Black African healthcare professional" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Care that fits your life</p>
                    <p className="text-xs text-muted-foreground">Clinics, hospitals, specialists, and pharmacy care</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[
            { value: formatStat(stats.doctors), label: "Verified Doctors", icon: Stethoscope },
            { value: formatStat(stats.hospitals), label: "Partner Hospitals", icon: Building2 },
            { value: formatStat(stats.pharmacies), label: "Pharmacies", icon: Pill },
            { value: `${stats.rating}★`, label: "Average Rating", icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card p-6 text-center shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <stat.icon className="mx-auto mb-3 h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
