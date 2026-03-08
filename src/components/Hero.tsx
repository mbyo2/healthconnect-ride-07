import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, CheckCircle, Star, Clock, Heart, Users, Stethoscope, Building2, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlatformStats, formatStat } from '@/hooks/usePlatformStats';

export const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const stats = usePlatformStats();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : '/search');
  };

  const quickActions = [
    { icon: Stethoscope, label: 'Find Doctor', route: '/search', color: 'text-primary' },
    { icon: Building2, label: 'Hospitals', route: '/healthcare-institutions', color: 'text-primary' },
    { icon: Heart, label: 'Emergency', route: '/emergency', color: 'text-destructive' },
    { icon: Users, label: 'Specialists', route: '/search', color: 'text-primary' },
  ];

  return (
    <div className="bg-gradient-to-b from-primary/5 to-background">
      <div className="container-modern py-12 md:py-20">
        {/* Trust bar */}
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 mb-10 text-sm text-muted-foreground">
          {[
            { icon: Shield, label: "Verified Providers" },
            { icon: CheckCircle, label: "Insurance Support" },
            { icon: Star, label: `${stats.rating}/5 Rating` },
            { icon: Clock, label: "24/7 Emergency" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-primary" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-5 text-foreground leading-tight tracking-tight">
              Healthcare for{" "}
              <span className="text-primary">Everyone</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Find trusted doctors, book instantly, consult via video — all from Zambia's most modern healthcare platform.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-lg mx-auto lg:mx-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search doctors, specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6 rounded-xl">
                Search
              </Button>
            </form>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-8 max-w-md mx-auto lg:mx-0">
              {[
                { value: formatStat(stats.doctors), label: "Doctors" },
                { value: formatStat(stats.hospitals), label: "Hospitals" },
                { value: formatStat(stats.pharmacies), label: "Pharmacies" },
                { value: formatStat(stats.patients), label: "Patients" },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 bg-card rounded-xl border border-border">
                  <div className="text-lg font-bold text-primary">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="flex-1 sm:flex-none rounded-xl h-12">
                <Link to="/auth?tab=signup">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1 sm:flex-none rounded-xl h-12">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>

          {/* Right column */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-3 md:hidden mb-6">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.route)}
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="font-medium text-sm text-foreground">{action.label}</span>
                </button>
              ))}
            </div>

            <div className="hidden md:block bg-card border border-border rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Your Health, Our Priority</h3>
                <p className="text-sm text-muted-foreground">Quality healthcare accessible anywhere</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: Stethoscope, text: "Find doctors near you" },
                  { icon: Building2, text: "Connected hospitals & clinics" },
                  { icon: Shield, text: "Insurance integration support" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
