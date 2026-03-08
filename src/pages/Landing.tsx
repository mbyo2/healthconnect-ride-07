import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/ui/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  Search, MapPin, Calendar, Video, Shield, Star,
  CheckCircle, Users, Building2, Clock, ArrowRight,
  Smartphone, Heart, Activity, Stethoscope, Phone,
  ChevronRight, Sparkles, Zap, Quote, Pill, Menu, X
} from "lucide-react";
import { ZAMBIAN_STATS, ZAMBIAN_TESTIMONIALS } from "@/config/zambia";

const Landing = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % ZAMBIAN_TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Header ─── */}
      <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <AppLogo size="sm" linkTo="/landing" className="shrink-0" />

            <nav className="hidden lg:flex items-center gap-1">
              {[
                { label: "Find Doctors", route: "/search" },
                { label: "For Providers", route: "/healthcare-professionals" },
                { label: "For Hospitals", route: "/healthcare-institutions" },
                { label: "Pricing", route: "/pricing" },
                { label: "Emergency", route: "/emergency" },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground font-medium text-sm px-3"
                  onClick={() => navigate(item.route)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex text-sm font-medium">
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate("/auth?tab=signup")} className="text-sm px-4 rounded-lg font-medium">
                Get Started
              </Button>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-background/98 backdrop-blur-xl border-b border-border animate-in slide-in-from-top-2 duration-200">
            <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1">
              {[
                { label: "Find Doctors", route: "/search" },
                { label: "For Providers", route: "/healthcare-professionals" },
                { label: "For Hospitals", route: "/healthcare-institutions" },
                { label: "Pricing", route: "/pricing" },
                { label: "Emergency", route: "/emergency" },
                { label: "Sign In", route: "/auth" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => { navigate(item.route); setMobileMenuOpen(false); }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ─── Hero ─── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
                <Sparkles className="h-3.5 w-3.5" />
                Trusted by {ZAMBIAN_STATS.patients} across Zambia
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                Healthcare{" "}
                <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
                Find trusted doctors, book instantly, consult via video — 
                all from Zambia's most modern healthcare platform.
              </p>

              {/* Search */}
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

              {/* Specialty pills */}
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

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
              {[
                { value: ZAMBIAN_STATS.doctors, label: "Verified Doctors", icon: Stethoscope },
                { value: ZAMBIAN_STATS.hospitals, label: "Partner Hospitals", icon: Building2 },
                { value: ZAMBIAN_STATS.pharmacies, label: "Pharmacies", icon: Pill },
                { value: "4.8★", label: "Average Rating", icon: Star },
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

        {/* ─── How It Works ─── */}
        <section className="py-24 md:py-32 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">How It Works</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Book in 4 Simple Steps
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-1 max-w-4xl mx-auto">
              {[
                { step: "1", title: "Search", desc: "Find by specialty, location, or insurance", icon: Search },
                { step: "2", title: "Compare", desc: "Read reviews, check availability & fees", icon: Star },
                { step: "3", title: "Book", desc: "Choose a time and confirm instantly", icon: Calendar },
                { step: "4", title: "Visit", desc: "See your doctor in-person or via video", icon: Video },
              ].map((item, idx) => (
                <div key={idx} className="relative text-center p-6 group">
                  <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <item.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div className="text-xs font-bold text-primary/60 mb-2 tracking-widest">STEP {item.step}</div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  {idx < 3 && (
                    <ChevronRight className="hidden md:block absolute top-10 -right-2 h-4 w-4 text-muted-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section className="py-24 md:py-32 bg-muted/30 border-y border-border/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Platform</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Everything in One Place
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                For patients, doctors, pharmacies, and hospitals — one unified platform.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Search, title: "Smart Doctor Search", desc: "Find the right doctor by specialty, condition, insurance, location, and verified ratings." },
                { icon: Calendar, title: "Instant Booking", desc: "Real-time availability with same-day appointments. No phone calls needed." },
                { icon: Video, title: "Video Consultations", desc: "Secure HD video visits from anywhere in Zambia. No downloads required." },
                { icon: Shield, title: "Insurance Verified", desc: "NHIMA partner with automatic coverage checks before you book." },
                { icon: Zap, title: "Digital Prescriptions", desc: "E-prescriptions sent directly to your nearest pharmacy for pickup or delivery." },
                { icon: Building2, title: "Hospital Management", desc: "Full HMS for hospitals — EMR, billing, admissions, lab, and pharmacy in one system." },
              ].map((f, idx) => (
                <Card key={idx} className="border-border/40 bg-card hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <f.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Testimonials ─── */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Testimonials</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Loved Across Zambia
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {ZAMBIAN_TESTIMONIALS.slice(0, 3).map((t, idx) => (
                <Card key={idx} className="border-border/40 bg-card hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Quote className="h-8 w-8 text-primary/20 mb-4" />
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      "{t.content}"
                    </p>
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
              ))}
            </div>

            {/* Second row for larger screens */}
            <div className="hidden lg:grid grid-cols-3 gap-6 max-w-5xl mx-auto mt-6">
              {ZAMBIAN_TESTIMONIALS.slice(3, 6).map((t, idx) => (
                <Card key={idx} className="border-border/40 bg-card hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Quote className="h-8 w-8 text-primary/20 mb-4" />
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      "{t.content}"
                    </p>
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
              ))}
            </div>
          </div>
        </section>

        {/* ─── For Providers ─── */}
        <section className="py-24 md:py-32 bg-muted/30 border-y border-border/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">For Providers</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                  Grow Your Practice with Doc' O Clock
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed max-w-md">
                  Whether you're a solo practitioner, pharmacy, or hospital — 
                  get the tools to manage patients, streamline operations, and increase revenue.
                </p>
                <div className="space-y-4 mb-10">
                  {[
                    { title: "Zero upfront fees", desc: "Only pay when new patients book through us" },
                    { title: "Full practice management", desc: "Appointments, EMR, prescriptions, billing" },
                    { title: "Video consultations", desc: "Reach patients anywhere in Zambia" },
                    { title: "Pharmacy POS & inventory", desc: "Complete pharmacy management system" },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate("/auth?tab=signup")} className="rounded-xl gap-2 font-medium">
                    Join as Provider <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/pricing")} className="rounded-xl font-medium">
                    View Pricing
                  </Button>
                </div>
              </div>

              {/* Provider preview card */}
              <div className="hidden lg:block">
                <div className="relative">
                  <Card className="border-border/40 shadow-2xl shadow-primary/5 bg-card overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />
                    <CardContent className="p-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Activity className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">Provider Dashboard</div>
                          <div className="text-xs text-muted-foreground">Real-time practice overview</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Today's Patients", value: "12", trend: "+3" },
                          { label: "This Week", value: "67", trend: "+12" },
                          { label: "Revenue", value: "K 24,500", trend: "+8%" },
                          { label: "Satisfaction", value: "98%", trend: "↑" },
                        ].map((stat) => (
                          <div key={stat.label} className="p-4 rounded-xl bg-muted/50 border border-border/30">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">{stat.value}</span>
                              <span className="text-xs text-primary font-medium">{stat.trend}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {/* Floating badge */}
                  <div className="absolute -top-3 -right-3 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-semibold border border-primary/20 shadow-sm flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> NHIMA Verified
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Browse Specialties ─── */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Specialties</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
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
                  className="rounded-full border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all"
                  onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
                >
                  {specialty}
                </Button>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="link" onClick={() => navigate("/search")} className="gap-1 text-primary font-medium">
                View all specialties <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              
              <div className="relative p-10 md:p-16 lg:p-20 text-center">
                <div className="max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-1.5 text-xs font-medium text-primary-foreground/90 mb-6 backdrop-blur-sm">
                    <Smartphone className="h-3.5 w-3.5" />
                    Works on any device
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-5 tracking-tight">
                    Your Health, Simplified
                  </h2>
                  <p className="text-primary-foreground/80 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                    Join thousands of Zambians who've made the switch to smarter healthcare. It's free to get started.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-xl gap-2 font-medium h-12 px-8 shadow-lg"
                      onClick={() => navigate("/auth?tab=signup")}
                    >
                      Get Started Free <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-xl border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-medium h-12 px-8"
                      onClick={() => navigate("/search")}
                    >
                      Browse Doctors
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <AppLogo size="sm" linkTo="/landing" className="mb-4" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Zambia's modern healthcare platform for patients, doctors, and hospitals.
              </p>
            </div>
            {[
              {
                title: "For Patients",
                links: [
                  { label: "Find a Doctor", href: "/search" },
                  { label: "Hospitals", href: "/healthcare-institutions" },
                  { label: "Pharmacies", href: "/search?type=pharmacy" },
                  { label: "Emergency", href: "/emergency" },
                ]
              },
              {
                title: "For Providers",
                links: [
                  { label: "Join as Doctor", href: "/auth?tab=signup" },
                  { label: "Register Hospital", href: "/auth?tab=signup" },
                  { label: "Pricing", href: "/pricing" },
                ]
              },
              {
                title: "Company",
                links: [
                  { label: "About", href: "/about" },
                  { label: "Contact", href: "/contact" },
                  { label: "Careers", href: "/contact" },
                ]
              },
              {
                title: "Legal",
                links: [
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Privacy Policy", href: "/privacy" },
                ]
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Doc' O Clock. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Made with ❤️ in Zambia 🇿🇲
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
