import { useNavigate, useLocation } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X, Search, Activity, Sparkles, User, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "WorkOS CRM Board", route: "/workos" },
  { label: "Find Care", route: "/search" },
  { label: "For Providers", route: "/healthcare-professionals" },
  { label: "Hospitals & Facilities", route: "/healthcare-institutions" },
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
  const [searchQuery, setSearchQuery] = useState("");

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
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${
      scrolled
        ? 'bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-xl shadow-xl'
        : 'bg-slate-950/70 border-b border-slate-800/50 backdrop-blur-md'
    } text-white`}>
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Brand Logo & Monday CRM Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <AppLogo size="sm" linkTo="/" className="shrink-0 text-white" />

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 shadow-inner">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d57]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#fdab3d]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c875]" />
              </div>
              <span className="font-mono text-[#0073ea] font-black uppercase text-[10px]">monday CRM</span>
            </div>
          </div>

          {/* Center: Search Box & Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 flex-1 max-w-2xl mx-4">
            <form onSubmit={handleQuickSearch} className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors, specialties, clinics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0073ea] transition-all"
              />
            </form>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.route);
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.route)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      active
                        ? 'text-white bg-[#0073ea] shadow-md shadow-blue-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions & CTAs */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <button
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-200 hover:bg-slate-800/80 transition-colors"
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

            <button
              className="p-1.5 rounded-xl lg:hidden text-slate-300 hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-2 animate-in slide-in-from-top-2">
          <form onSubmit={handleQuickSearch} className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors, hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </form>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.route);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
