import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Sparkles, Stethoscope, Building2, Pill, Star } from "lucide-react";
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
    <section className="relative pt-24 pb-12 md:pt-28 md:pb-14 lg:pt-32 lg:pb-20 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Sparkles className="h-3.5 w-3.5" />
            Trusted by {formatStat(stats.patients)} users
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Healthcare{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            Find trusted doctors, book instantly, consult via video — 
            all from your most modern healthcare platform.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <div className="relative flex gap-2 p-1.5 rounded-2xl border border-border/60 bg-card shadow-lg shadow-primary/5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search doctors, specialties, or conditions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-0 bg-transparent shadow-none text-sm focus-visible:ring-0"
                />
              </div>
              <Button type="submit" className="h-11 px-6 rounded-xl font-medium">
                Search
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-[400ms]">
            {["General Practice", "Cardiology", "Pediatrics", "Dentistry", "Gynecology"].map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8 border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
                onClick={() => navigate(`/search?specialty=${encodeURIComponent(s)}`)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          {[
            { value: formatStat(stats.doctors), label: "Verified Doctors", icon: Stethoscope },
            { value: formatStat(stats.hospitals), label: "Partner Hospitals", icon: Building2 },
            { value: formatStat(stats.pharmacies), label: "Pharmacies", icon: Pill },
            { value: `${stats.rating}★`, label: "Average Rating", icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 md:p-5 rounded-2xl bg-card border border-border/40 shadow-sm">
              <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
