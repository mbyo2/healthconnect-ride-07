import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X, Search, Activity, Sparkles, User, ArrowRight } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Find Doctors", route: "/search" },
  { label: "For Providers", route: "/healthcare-professionals" },
  { label: "For Hospitals", route: "/healthcare-institutions" },
  { label: "Pricing", route: "/pricing" },
  { label: "Emergency", route: "/emergency" },
  { label: "WorkOS Board", route: "/workos" },
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
    <header className={`fixed top-0 z-50 w-full transition-all duration-200 ${
      scrolled
        ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#e6e9ef] dark:border-slate-800 shadow-sm'
        : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-[#e6e9ef]/60 dark:border-slate-800/60'
    }`}>
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Left: Brand Logo & Monday Workspace Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <AppLogo size="sm" linkTo="/" className="shrink-0" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f0f2f7] dark:bg-slate-800 border border-[#e6e9ef] dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#00c875] animate-pulse" />
              <span>Zambia WorkOS</span>
            </div>
          </div>

          {/* Center: Search Box & Nav Links */}
          <div className="hidden lg:flex items-center gap-6 flex-1 max-w-2xl mx-4">
            <form onSubmit={handleQuickSearch} className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors, hospitals, Rx..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#c3c6d4] dark:border-slate-700 bg-[#f5f6f8] dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0073ea] transition-all"
              />
            </form>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.route);
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.route)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      active
                        ? 'text-[#0073ea] bg-[#e5f0ff] dark:bg-blue-950/60 dark:text-blue-400'
                        : 'text-[#676879] hover:text-[#111827] hover:bg-[#f0f2f7] dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-md text-xs font-bold text-[#323338] dark:text-slate-200 hover:bg-[#f0f2f7] dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </button>

            <button
              onClick={() => navigate("/auth?tab=signup")}
              className="px-4 py-1.5 rounded-md text-xs font-extrabold bg-[#0073ea] hover:bg-[#0060c4] text-white shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              className="p-1.5 rounded-md lg:hidden text-slate-600 hover:bg-[#f0f2f7] dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 p-4 space-y-2 animate-in slide-in-from-top-2">
          <form onSubmit={handleQuickSearch} className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors, hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-[#c3c6d4] bg-[#f5f6f8] text-xs"
            />
          </form>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.route);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#f0f2f7] dark:hover:bg-slate-800"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
