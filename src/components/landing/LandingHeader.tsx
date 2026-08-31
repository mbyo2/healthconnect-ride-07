import { useNavigate, useLocation } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Menu, X, Search, Activity, Sparkles, User, ArrowRight, Zap,
  ShieldCheck, LayoutDashboard, Stethoscope, Building2, HelpCircle,
  CheckCircle2, ChevronDown
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { label: "WorkOS CRM", route: "/workos", badge: "Live" },
  { label: "Find Care", route: "/search" },
  { label: "Providers", route: "/healthcare-professionals" },
  { label: "Hospitals", route: "/healthcare-institutions" },
  { label: "Pricing", route: "/pricing" },
  { label: "Emergency", route: "/emergency", isEmergency: true },
];

interface LandingHeaderProps {
  scrolled: boolean;
}

export const LandingHeader = ({ scrolled }: LandingHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const isActive = (route: string) => location.pathname === route;

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/search");
    }
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-2xl shadow-2xl shadow-blue-950/20"
          : "bg-slate-950/75 border-b border-slate-800/50 backdrop-blur-xl"
      } text-white`}
    >
      {/* Top micro-announcement banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-[11px] font-bold py-1 px-4 text-center flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
        <span>⚡ Doc' O Clock WorkOS 2.0 is live — Experience Zambia's #1 Healthcare CRM with MedGemma AI Copilot</span>
        <button
          onClick={() => navigate("/workos")}
          className="underline hover:text-white/90 font-black ml-1 cursor-pointer hidden sm:inline"
        >
          Try Demo Board &rarr;
        </button>
      </div>

      <div className="mx-auto max-w-[1550px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Left: Brand Logo & Monday 3-color WorkOS Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <AppLogo size="sm" linkTo="/" className="shrink-0 text-white" />

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-bold text-slate-300 shadow-inner">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d57]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#fdab3d]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c875]" />
              </div>
              <span className="font-mono text-[#0073ea] font-black uppercase text-[10px] tracking-wider">
                WorkOS CRM
              </span>
            </div>
          </div>

          {/* Center: Search Box & Navigation Links */}
          <div className="hidden lg:flex items-center gap-4 flex-1 max-w-3xl mx-2">
            {/* Quick Search Bar with Interactive Focus State */}
            <form
              onSubmit={handleQuickSearch}
              className={`relative w-full max-w-xs transition-all duration-200 ${
                isSearchFocused ? "max-w-sm ring-2 ring-[#0073ea]/50" : ""
              }`}
            >
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors, hospitals, services..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-full border border-slate-800 bg-slate-900/90 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0073ea] focus:bg-slate-900 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </form>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.route);
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.route)}
                    className={`relative px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      item.isEmergency
                        ? "text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50"
                        : active
                        ? "text-white bg-[#0073ea] shadow-md shadow-blue-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-[#00c875] text-slate-950">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Theme, Sign In, and Main CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            <button
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Sign In
            </button>

            <button
              onClick={() => navigate("/auth?tab=signup")}
              className="px-4 py-2 rounded-full text-xs font-black bg-gradient-to-r from-[#0073ea] via-indigo-600 to-[#a25ddc] hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              className="p-2 rounded-xl lg:hidden text-slate-300 hover:bg-slate-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950/98 border-b border-slate-800 p-4 space-y-3 animate-in slide-in-from-top-2 backdrop-blur-2xl">
          <form onSubmit={handleQuickSearch} className="relative mb-2">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors, hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0073ea]"
            />
          </form>

          <div className="grid grid-cols-1 gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.route);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  isActive(item.route)
                    ? "bg-[#0073ea] text-white"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#00c875] text-slate-950">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={() => {
                navigate("/auth");
                setMobileMenuOpen(false);
              }}
              className="w-1/2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 text-center"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                navigate("/auth?tab=signup");
                setMobileMenuOpen(false);
              }}
              className="w-1/2 py-2 rounded-xl bg-[#0073ea] text-xs font-black text-white text-center"
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
