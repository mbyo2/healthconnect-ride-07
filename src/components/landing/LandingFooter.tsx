import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";
import { ArrowRight, Smartphone } from "lucide-react";

export const BrowseSpecialties = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-br from-primary/5 via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary),0.08),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4 border border-primary/20">
            <Smartphone className="h-3.5 w-3.5" />
            Specialties
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">Find Care by Specialty</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Browse our network of specialists across Zambia
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {[
            "General Practice", "Cardiology", "Dermatology", "Pediatrics",
            "Gynecology", "Orthopedics", "Psychiatry", "Dentistry",
            "Ophthalmology", "ENT", "Neurology", "Urology"
          ].map((specialty, idx) => (
            <Button
              key={specialty}
              variant="outline"
              className="rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-105"
              onClick={() => navigate(`/search?specialty=${encodeURIComponent(specialty)}`)}
            >
              {specialty}
            </Button>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="link" onClick={() => navigate("/search")} className="gap-2 text-primary font-semibold text-lg hover:text-primary/80 transition-colors">
            View all specialties <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 lg:py-24 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[2.5rem] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.1),transparent)]" />
          
          <div className="relative p-12 md:p-16 lg:p-24 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-5 py-2 text-sm font-semibold text-primary-foreground mb-8 backdrop-blur-sm border border-primary-foreground/30 animate-pulse-glow">
                <Smartphone className="h-4 w-4" />
                Works on any device
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-6xl font-bold text-primary-foreground mb-6 tracking-tight leading-tight">
                Your Health, <br />
                <span className="text-primary-foreground/90">Simplified</span>
              </h2>
              <p className="text-primary-foreground/85 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                Join thousands of Zambians who've made the switch to smarter healthcare. It's free to get started.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-xl gap-2 font-semibold h-14 px-10 shadow-2xl hover:scale-105 transition-transform"
                  onClick={() => navigate("/auth?tab=signup")}
                >
                  Get Started Free <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/15 font-semibold h-14 px-10 bg-primary-foreground/10 backdrop-blur-sm hover:scale-105 transition-transform"
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
  );
};

const FOOTER_SECTIONS = [
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
];

export const LandingFooter = () => (
  <footer className="border-t border-border/40 bg-muted/20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
        <div className="col-span-2 md:col-span-1">
          <AppLogo size="sm" linkTo="/landing" className="mb-4" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Zambia's modern healthcare platform for patients, doctors, and hospitals.
          </p>
        </div>
        {FOOTER_SECTIONS.map((section) => (
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
);
