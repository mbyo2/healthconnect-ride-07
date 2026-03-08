import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/ui/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Search, MapPin, Calendar, Video, Shield, Star,
  CheckCircle, Users, Building2, Clock, ArrowRight,
  Smartphone, Heart, Activity, Stethoscope, Phone,
  ChevronRight, Sparkles, Zap
} from "lucide-react";
import { ZAMBIAN_STATS } from "@/config/zambia";

const Landing = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Header ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <AppLogo size="sm" linkTo="/landing" />

            <nav className="hidden md:flex items-center gap-1">
              {["Find Doctors", "For Providers", "Emergency"].map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground font-medium"
                  onClick={() =>
                    navigate(
                      item === "Find Doctors" ? "/search" :
                      item === "For Providers" ? "/healthcare-application" :
                      "/emergency"
                    )
                  }
                >
                  {item}
                </Button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate("/auth?tab=signup")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left – Copy */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Trusted by {ZAMBIAN_STATS.patients} Zambians
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
                  Book a Doctor
                  <span className="block text-primary">In Minutes</span>
                </h1>

                <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
                  Find trusted doctors, compare reviews, check insurance, and book
                  instantly — in-person or video. Zambia's #1 healthcare platform.
                </p>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Specialty, doctor, or condition..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-border/60 bg-background shadow-sm text-base focus-visible:ring-primary/30"
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-12 px-6 rounded-xl shadow-sm">
                    Search
                  </Button>
                </form>

                {/* Quick links */}
                <div className="flex flex-wrap gap-2">
                  {["General Practice", "Cardiology", "Pediatrics", "Dentistry"].map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs border-border/60 hover:bg-muted"
                      onClick={() => navigate(`/search?specialty=${encodeURIComponent(s)}`)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Right – Stats + Quick Actions Card */}
              <div className="hidden lg:block">
                <div className="relative">
                  <Card className="border-border/40 shadow-xl bg-card/80 backdrop-blur">
                    <CardContent className="p-8">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        {[
                          { value: ZAMBIAN_STATS.doctors, label: "Verified Doctors", icon: Stethoscope, color: "text-primary" },
                          { value: ZAMBIAN_STATS.hospitals, label: "Partner Hospitals", icon: Building2, color: "text-emerald-600 dark:text-emerald-400" },
                          { value: ZAMBIAN_STATS.pharmacies, label: "Pharmacies", icon: Heart, color: "text-rose-600 dark:text-rose-400" },
                          { value: "4.8★", label: "Avg. Rating", icon: Star, color: "text-amber-600 dark:text-amber-400" },
                        ].map((stat) => (
                          <div key={stat.label} className="text-center p-4 rounded-xl bg-muted/50 border border-border/30">
                            <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                            <div className="text-xl font-bold text-foreground">{stat.value}</div>
                            <div className="text-[11px] text-muted-foreground font-medium">{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Quick actions */}
                      <div className="space-y-3">
                        {[
                          { icon: Calendar, label: "Book an appointment", desc: "Same-day available", route: "/search" },
                          { icon: Video, label: "Start a video visit", desc: "See a doctor now", route: "/search" },
                          { icon: Phone, label: "Emergency: Call 991", desc: "24/7 hotline", route: "tel:991" },
                        ].map((action) => (
                          <button
                            key={action.label}
                            onClick={() => action.route.startsWith("tel:") ? window.location.href = action.route : navigate(action.route)}
                            className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-border/30 bg-background hover:bg-muted/50 transition-colors group text-left"
                          >
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <action.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground">{action.label}</div>
                              <div className="text-xs text-muted-foreground">{action.desc}</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Floating badges */}
                  <div className="absolute -top-3 -right-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-500/20 shadow-sm">
                    🇿🇲 Made in Zambia
                  </div>
                  <div className="absolute -bottom-3 -left-3 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold border border-primary/20 shadow-sm flex items-center gap-1.5">
                    <Shield className="h-3 w-3" /> NHIMA Approved
                  </div>
                </div>
              </div>

              {/* Mobile quick actions */}
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                {[
                  { icon: Stethoscope, label: "Find Doctor", route: "/search", color: "text-primary" },
                  { icon: Building2, label: "Hospitals", route: "/healthcare-institutions", color: "text-emerald-600 dark:text-emerald-400" },
                  { icon: Video, label: "Video Visit", route: "/search", color: "text-blue-600 dark:text-blue-400" },
                  { icon: Phone, label: "Call 991", route: "tel:991", color: "text-destructive" },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => a.route.startsWith("tel:") ? window.location.href = a.route : navigate(a.route)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/50 transition-colors active:scale-[0.98]"
                  >
                    <a.icon className={`h-5 w-5 ${a.color}`} />
                    <span className="text-sm font-semibold text-foreground">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Social Proof Bar ─── */}
        <section className="border-y border-border/40 bg-muted/30 py-5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 text-sm">
              {[
                { icon: Users, value: ZAMBIAN_STATS.patients, label: "Patients" },
                { icon: Activity, value: ZAMBIAN_STATS.doctors, label: "Doctors" },
                { icon: Building2, value: ZAMBIAN_STATS.hospitals, label: "Hospitals" },
                { icon: MapPin, value: ZAMBIAN_STATS.provinces, label: "Provinces" },
                { icon: Star, value: "4.8/5", label: "Rating" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-muted-foreground">
                  <s.icon className="h-4 w-4" />
                  <span className="font-bold text-foreground">{s.value}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Your Appointment in 4 Steps
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                From search to visit — the simplest way to see a doctor in Zambia.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { step: "01", title: "Search", desc: "Browse doctors by specialty, location, or insurance", icon: Search },
                { step: "02", title: "Compare", desc: "Read verified reviews and check availability", icon: Star },
                { step: "03", title: "Book", desc: "Pick a time slot and confirm instantly", icon: Calendar },
                { step: "04", title: "Visit", desc: "See your doctor in-person or via video", icon: Video },
              ].map((item, idx) => (
                <div key={idx} className="relative text-center group">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-[11px] font-bold text-primary mb-1">{item.step}</div>
                  <h3 className="font-semibold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  {idx < 3 && (
                    <ArrowRight className="hidden md:block absolute top-7 -right-4 h-4 w-4 text-border" />
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mt-14">
              <Button size="lg" className="rounded-xl gap-2 shadow-sm" onClick={() => navigate("/auth?tab=signup")}>
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section className="py-20 md:py-28 bg-muted/30 border-y border-border/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                One platform for patients, doctors, and hospitals.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Search, title: "Smart Search", desc: "Find doctors by specialty, condition, or insurance instantly." },
                { icon: Calendar, title: "Instant Booking", desc: "Book same-day appointments with real-time availability." },
                { icon: Video, title: "Video Visits", desc: "Secure telehealth consultations from anywhere in Zambia." },
                { icon: Shield, title: "Insurance Verified", desc: "NHIMA partner with automatic coverage verification." },
                { icon: Zap, title: "Digital Prescriptions", desc: "E-prescriptions sent directly to your pharmacy." },
                { icon: Clock, title: "24/7 Emergency", desc: "One-tap emergency access and ambulance dispatch." },
              ].map((f, idx) => (
                <Card key={idx} className="border-border/40 shadow-sm hover:shadow-md transition-shadow bg-card">
                  <CardContent className="p-6">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Browse by Specialty ─── */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Specialties</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Find Care by Specialty
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {[
                "General Practice", "Cardiology", "Dermatology", "Pediatrics",
                "Gynecology", "Orthopedics", "Psychiatry", "Dentistry",
                "Ophthalmology", "ENT", "Neurology", "Urology"
              ].map((specialty) => (
                <Button
                  key={specialty}
                  variant="outline"
                  className="rounded-full border-border/60 hover:bg-muted"
                  onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
                >
                  {specialty}
                </Button>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="link" onClick={() => navigate("/search")} className="gap-1 text-primary">
                View All Specialties <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── For Providers CTA ─── */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] border-y border-border/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="secondary" className="mb-4">For Providers</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Grow Your Practice
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed max-w-md">
                  Join Zambia's largest healthcare network. Manage appointments, EMR,
                  billing, and patient communication — all from one dashboard.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "Digital appointment management",
                    "Integrated EMR & prescriptions",
                    "Video consultation support",
                    "Revenue analytics & billing"
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="h-4.5 w-4.5 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate("/healthcare-application")} className="rounded-xl gap-2">
                    Join as Doctor <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/institution-registration")} className="rounded-xl">
                    Register Hospital
                  </Button>
                </div>
              </div>

              <div className="hidden md:block">
                <Card className="border-border/40 shadow-xl bg-card/80 backdrop-blur">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Stethoscope className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Provider Dashboard</div>
                        <div className="text-xs text-muted-foreground">MocDoc-powered HMS</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Today's Queue", value: "12" },
                        { label: "This Week", value: "67" },
                        { label: "Revenue", value: "K 24,500" },
                        { label: "Satisfaction", value: "98%" },
                      ].map((stat) => (
                        <div key={stat.label} className="p-3 rounded-lg bg-muted/50 border border-border/30 text-center">
                          <div className="text-lg font-bold text-foreground">{stat.value}</div>
                          <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Mobile CTA ─── */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-10 md:p-16 text-center">
              <div className="mx-auto max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-primary-foreground mb-6">
                  <Smartphone className="h-3.5 w-3.5" />
                  Available on mobile
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Your Health, In Your Pocket
                </h2>
                <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
                  Book appointments, video-call your doctor, refill prescriptions,
                  and access your health records — anywhere, anytime.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="secondary" size="lg" className="rounded-xl gap-2 shadow-sm">
                    <Smartphone className="h-5 w-5" /> Download App
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-xl border-primary-foreground/30 text-primary-foreground hover:bg-white/10"
                    onClick={() => navigate("/auth?tab=signup")}
                  >
                    Sign Up Free
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">For Patients</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="/search" className="hover:text-foreground transition-colors">Find a Doctor</a></li>
                <li><a href="/healthcare-institutions" className="hover:text-foreground transition-colors">Hospitals</a></li>
                <li><a href="/emergency" className="hover:text-foreground transition-colors">Emergency</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">For Providers</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="/healthcare-application" className="hover:text-foreground transition-colors">Join as Doctor</a></li>
                <li><a href="/institution-registration" className="hover:text-foreground transition-colors">Register Hospital</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="/terms" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
            <AppLogo size="sm" linkTo="/landing" />
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Doc' O Clock. Made with ❤️ in Zambia 🇿🇲
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
