import { useNavigate, useLocation } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Find Doctors", route: "/search" },
  { label: "Video Consult", route: "/video-dashboard" },
  { label: "Pharmacies", route: "/search?type=pharmacy" },
  { label: "Hospitals", route: "/healthcare-institutions" },
  { label: "For Providers", route: "/healthcare-professionals" },
];

interface LandingHeaderProps {
  scrolled: boolean;
}

export const LandingHeader = ({ scrolled }: LandingHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (route: string) => location.pathname === route.split("?")[0];

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <a
        href="#main-content"
        className="pointer-events-auto sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-pill focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      <div
        className={`pointer-events-auto mx-auto flex max-w-content items-center gap-2 rounded-nav border px-2 py-1.5 shadow-pill-nav backdrop-blur-xl transition-all duration-300 sm:px-3 ${
          scrolled
            ? "border-canvas-silk bg-white/95"
            : "border-white/70 bg-white/80"
        }`}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex shrink-0 items-center gap-2 rounded-pill px-2 py-1"
          aria-label="Doc' O Clock home"
        >
          <AppLogo size="sm" linkTo="/" showText={false} className="shrink-0" />
          <span className="hidden font-display text-[15px] tracking-tight text-midnight sm:inline">
            Doc&apos; O Clock
          </span>
        </button>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.route)}
              className={`rounded-pill px-3 py-2 text-[13px] font-medium tracking-wide transition-colors ${
                isActive(item.route)
                  ? "bg-canvas-mist text-midnight"
                  : "text-graphite-600 hover:bg-canvas-mist hover:text-midnight"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate("/emergency")}
            className="rounded-pill px-3 py-2 text-[13px] font-medium tracking-wide text-accent-600 hover:bg-accent-50"
          >
            Emergency
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="hidden rounded-pill px-3.5 py-2 text-[13px] font-medium text-graphite-600 hover:bg-canvas-mist hover:text-midnight sm:inline-flex"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="vf-btn-primary !px-4 !py-2 text-[13px]"
          >
            Get started
          </button>
          <button
            type="button"
            className="rounded-pill p-2 text-graphite-600 hover:bg-canvas-mist lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="pointer-events-auto mx-auto mt-2 max-w-content rounded-card border border-canvas-silk bg-white/95 p-3 shadow-pill-nav backdrop-blur-xl lg:hidden">
          <div className="space-y-1">
            {[...NAV_ITEMS, { label: "Emergency", route: "/emergency" }].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  navigate(item.route);
                  setMobileMenuOpen(false);
                }}
                className={`w-full rounded-nav px-4 py-3 text-left text-sm font-medium transition-colors ${
                  isActive(item.route)
                    ? "bg-primary-50 text-primary-600"
                    : item.label === "Emergency"
                    ? "text-accent-600 hover:bg-accent-50"
                    : "text-charcoal hover:bg-canvas-mist"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigate("/auth");
                  setMobileMenuOpen(false);
                }}
                className="flex-1 vf-btn-secondary !py-2.5 text-xs"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/search");
                  setMobileMenuOpen(false);
                }}
                className="flex-1 vf-btn-primary !py-2.5 text-xs"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
