import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search, Calendar, Video, Shield, Zap, Building2,
  ChevronRight, Star, CheckCircle, ArrowRight, Activity
} from "lucide-react";
import { CareOrbit } from "@/components/landing/CareOrbit";

export const CareExperience = () => (
  <section className="overflow-hidden py-16 md:py-20 lg:py-24 bg-gradient-to-b from-primary/5 via-background to-background relative">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary),0.1),transparent)]" />
    <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8 relative">
      <div className="relative order-2 lg:order-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl" />
        <CareOrbit />
      </div>
      <div className="order-1 lg:order-2 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          <Activity className="h-3.5 w-3.5" />
          Connected Care
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
          One care journey, <br />
          <span className="text-primary">designed around you.</span>
        </h2>
        <p className="max-w-xl text-muted-foreground leading-relaxed text-lg">
          Move naturally between finding a provider, booking a visit, managing prescriptions, and keeping your health information close.
        </p>
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl shadow-primary/10 group hover:shadow-primary/20 transition-shadow duration-500">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1758691462743-f9fc9e430d39?auto=format&fit=crop&w=1200&q=85"
              alt="Doctor providing a telehealth consultation to a Black patient"
              loading="lazy"
              className="h-56 w-full object-cover sm:h-64 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
          <div className="p-6 bg-card">
            <p className="font-semibold text-lg">Care that meets you where you are</p>
            <p className="mt-2 text-muted-foreground">In person, by video, or through your trusted pharmacy.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-background via-muted/20 to-background relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4 border border-primary/20">
            <Zap className="h-3.5 w-3.5" />
            Simple Process
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">Book in 4 Simple Steps</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From search to visit, we've made healthcare booking effortless
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { step: "01", title: "Search", desc: "Find by specialty, location, or insurance", icon: Search, color: "from-blue-500/20 to-blue-500/5" },
            { step: "02", title: "Compare", desc: "Read reviews, check availability & fees", icon: Star, color: "from-purple-500/20 to-purple-500/5" },
            { step: "03", title: "Book", desc: "Choose a time and confirm instantly", icon: Calendar, color: "from-emerald-500/20 to-emerald-500/5" },
            { step: "04", title: "Visit", desc: "See your doctor in-person or via video", icon: Video, color: "from-orange-500/20 to-orange-500/5" },
          ].map((item, idx) => (
            <div key={idx} className="relative group">
              <div className={`relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br ${item.color} p-8 text-center transition-all duration-300 hover:shadow-xl hover:scale-105`}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                <div className="relative">
                  <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-background shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-3 tracking-widest">STEP {item.step}</div>
                  <h3 className="font-bold text-xl mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
              {idx < 3 && (
                <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 h-6 w-6 text-muted-foreground/30 -translate-y-1/2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const Features = () => (
  <section className="py-16 md:py-20 lg:py-24 bg-background relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(var(--primary),0.08),transparent)]" />
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-4 border border-primary/20">
          <Shield className="h-3.5 w-3.5" />
          Comprehensive Platform
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">Everything in One Place</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          For patients, doctors, pharmacies, and hospitals — one unified platform.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: Search, title: "Smart Doctor Search", desc: "Find the right doctor by specialty, condition, insurance, location, and verified ratings.", gradient: "from-blue-500/10 to-blue-500/5" },
          { icon: Calendar, title: "Instant Booking", desc: "Real-time availability with same-day appointments. No phone calls needed.", gradient: "from-emerald-500/10 to-emerald-500/5" },
          { icon: Video, title: "Video Consultations", desc: "Secure HD video visits from anywhere in Zambia. No downloads required.", gradient: "from-purple-500/10 to-purple-500/5" },
          { icon: Shield, title: "Insurance Verified", desc: "NHIMA partner with automatic coverage checks before you book.", gradient: "from-amber-500/10 to-amber-500/5" },
          { icon: Zap, title: "Digital Prescriptions", desc: "E-prescriptions sent directly to your nearest pharmacy for pickup or delivery.", gradient: "from-rose-500/10 to-rose-500/5" },
          { icon: Building2, title: "Hospital Management", desc: "Full HMS for hospitals — EMR, billing, admissions, lab, and pharmacy in one system.", gradient: "from-cyan-500/10 to-cyan-500/5" },
        ].map((f, idx) => (
          <Card key={idx} className="border-border/40 bg-card hover:shadow-2xl hover:border-primary/30 transition-all duration-500 group overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <CardContent className="p-8 relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-primary/20">
                <f.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-3">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export const ForProviders = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary),0.15),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-white space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-xs font-semibold text-primary-foreground border border-primary/30">
              <Building2 className="h-3.5 w-3.5" />
              For Healthcare Providers
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Grow Your Practice <br />
              <span className="text-primary">with Doc' O Clock</span>
            </h2>
            <p className="text-slate-300 leading-relaxed text-lg max-w-md">
              Whether you're a solo practitioner, pharmacy, or hospital — 
              get the tools to manage patients, streamline operations, and increase revenue.
            </p>
            <div className="space-y-5">
              {[
                { title: "Zero upfront fees", desc: "Only pay when new patients book through us" },
                { title: "Full practice management", desc: "Appointments, EMR, prescriptions, billing" },
                { title: "Video consultations", desc: "Reach patients anywhere in Zambia" },
                { title: "Pharmacy POS & inventory", desc: "Complete pharmacy management system" },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 group">
                  <div className="mt-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:scale-110 transition-all">
                    <CheckCircle className="h-3.5 w-3.5 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-sm text-slate-400">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button onClick={() => navigate("/auth?tab=signup")} className="rounded-xl gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
                Join as Provider <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/pricing")} className="rounded-xl font-medium border-slate-600 text-white hover:bg-slate-800 hover:border-slate-500">
                View Pricing
              </Button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative">
              <Card className="border-slate-700/50 shadow-2xl bg-slate-800/50 backdrop-blur-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />
                <img
                  src="https://images.unsplash.com/photo-1666886573440-16ac24f89e31?auto=format&fit=crop&w=1200&q=85"
                  alt="Black healthcare professional and patient reviewing care on a tablet"
                  loading="lazy"
                  className="h-52 w-full object-cover opacity-90"
                />
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Activity className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-lg">Provider Dashboard</div>
                      <div className="text-xs text-slate-400">Real-time practice overview</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Today's Patients", value: "12", trend: "+3" },
                      { label: "This Week", value: "67", trend: "+12" },
                      { label: "Revenue", value: "K 24,500", trend: "+8%" },
                      { label: "Satisfaction", value: "98%", trend: "↑" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-5 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:border-primary/50 transition-colors">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-white">{stat.value}</span>
                          <span className="text-xs text-primary font-medium">{stat.trend}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold border border-primary/30 shadow-xl shadow-primary/20 flex items-center gap-2">
                <Shield className="h-4 w-4" /> NHIMA Verified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
