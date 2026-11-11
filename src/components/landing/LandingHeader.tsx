import { Link, useNavigate, useLocation } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";

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
  const { theme, setTheme } = useTheme();

  const isActive = (route: string) => location.pathname === route.split("?")[0];

  return (
    // CLASSIC PayPal shell (CEO decision 2026-11-11 17:12): the landing
    // bar is the same classic navy #003087 as the app bars, with white
    // content in BOTH modes (navybar is a fixed hex token — dark mode
    // never turns it slate/black/white). It is a full-width fixed bar,
    // not a floating pill; the hero's top padding reserves its height so
    // no content hides under it.
    <header
      className={`fixed inset-x-0 top-0 z-50 w-full border-b border-white/10 bg-navybar text-white transition-shadow duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-pill focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-3 sm:px-4">
        {/* Single interactive element for the logo home action: AppLogo is
            rendered link-less (linkTo="") and this Link is the one anchor.
            Its accessible name comes from aria-label alone — the img alt
            ("Doc' O Clock") is not concatenated, so the name is stated once. */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-pill px-2 py-1 hover:opacity-80 transition-opacity"
          aria-label="Doc' O Clock home"
        >
          <AppLogo size="sm" linkTo="" showText={false} className="shrink-0" />
          <span className="hidden font-display text-[15px] tracking-tight text-white sm:inline">
            Doc&apos; O Clock
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.route)}
              className={`rounded-pill px-3 py-2 text-[13px] font-medium tracking-wide transition-colors min-h-[44px] inline-flex items-center ${
                isActive(item.route)
                  ? "bg-white/15 text-white font-semibold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate("/emergency")}
            className="rounded-pill px-3 py-2 text-[13px] font-medium tracking-wide text-white/80 hover:bg-white/10 hover:text-white min-h-[44px] inline-flex items-center"
          >
            Emergency
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-pill p-3 text-white hover:bg-white/10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="hidden rounded-pill px-3.5 py-2 text-[13px] font-medium text-white hover:bg-white/10 sm:inline-flex"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="rounded-pill bg-gold px-4 py-3 text-[13px] font-semibold text-gold-ink transition-colors hover:bg-gold-deep"
          >
            Get started
          </button>
          <button
            type="button"
            className="rounded-pill p-3 text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mx-auto max-w-content px-3 pb-3 sm:px-4 lg:hidden">
          <div className="space-y-1 rounded-card border border-canvas-silk bg-white p-3 shadow-pill-nav dark:bg-slate-900/95">
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
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/search");
                  setMobileMenuOpen(false);
                }}
                className="flex-1 rounded-pill bg-gold py-2.5 text-xs font-semibold text-gold-ink transition-colors hover:bg-gold-deep inline-flex items-center justify-center"
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
