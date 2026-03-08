import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";
import { ArrowRight, Smartphone } from "lucide-react";

export const BrowseSpecialties = () => {
  const navigate = useNavigate();

  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Specialties</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Find Care by Specialty</h2>
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
  );
};

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
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
                  className="rounded-xl border-2 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/15 font-medium h-12 px-8 bg-primary-foreground/10"
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
