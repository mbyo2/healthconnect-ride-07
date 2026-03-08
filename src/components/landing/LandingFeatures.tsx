import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search, Calendar, Video, Shield, Zap, Building2,
  ChevronRight, Star, CheckCircle, ArrowRight, Activity
} from "lucide-react";

export const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 md:py-14 lg:py-20 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Book in 4 Simple Steps</h2>
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
  );
};

export const Features = () => (
  <section className="py-14 md:py-20 bg-muted/30 border-y border-border/30">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Platform</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Everything in One Place</h2>
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
);

export const ForProviders = () => {
  const navigate = useNavigate();

  return (
    <section className="py-14 md:py-20 bg-muted/30 border-y border-border/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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
              <div className="absolute -top-3 -right-3 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-semibold border border-primary/20 shadow-sm flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> NHIMA Verified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
