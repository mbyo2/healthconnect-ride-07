import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Find Doctors", route: "/search" },
  { label: "For Providers", route: "/healthcare-professionals" },
  { label: "For Hospitals", route: "/healthcare-institutions" },
  { label: "Pricing", route: "/pricing" },
  { label: "Emergency", route: "/emergency" },
];

interface LandingHeaderProps {
  scrolled: boolean;
}

export const LandingHeader = ({ scrolled }: LandingHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (route: string) => location.pathname === route;

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${
      scrolled ? 'bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm' : 'bg-transparent'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <AppLogo size="sm" linkTo="/landing" className="shrink-0" />

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.route);
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${active
                      ? 'text-primary-foreground bg-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-sm'
                    }
                  `}
                >
                  {item.label}
                </button>
              );
            })}
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

      {mobileMenuOpen && (
        <div className="lg:hidden bg-background/98 backdrop-blur-xl border-b border-border animate-in slide-in-from-top-2 duration-200">
          <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1">
            {[...NAV_ITEMS, { label: "Sign In", route: "/auth" }].map((item) => {
              const active = isActive(item.route);
              return (
                <button
                  key={item.label}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'text-primary-foreground bg-primary shadow-sm'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                  onClick={() => { navigate(item.route); setMobileMenuOpen(false); }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
