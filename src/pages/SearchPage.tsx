import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Search, Stethoscope, SlidersHorizontal } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSearch } from "@/context/SearchContext";
import { SearchResults } from "@/components/SearchResults";
import { SearchFilters } from "@/components/SearchFilters";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";

const SearchPage = () => {
  const { searchQuery, setSearchQuery, setSearchTerm, setSelectedSpecialty, refreshProviders } = useSearch();
  const { showSuccess } = useSuccessFeedback();
  const location = useLocation();
  const initializedRef = useRef(false);
  const lastSearchRef = useRef<string>("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchTerm(searchQuery);
      refreshProviders();
      showSuccess({ message: `Searching for "${searchQuery}"` });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  useEffect(() => {
    const searchString = location.search;
    if (lastSearchRef.current === searchString && initializedRef.current) return;
    lastSearchRef.current = searchString;
    initializedRef.current = true;

    const urlParams = new URLSearchParams(searchString);
    const query = urlParams.get("q");
    const category = urlParams.get("category");

    if (query) {
      setSearchQuery(query);
      setSearchTerm(query);
      refreshProviders();
    } else if (category) {
      const categoryMap: Record<string, string> = {
        skin: "Dermatology",
        heart: "Cardiology",
        mental: "Psychiatry",
        pediatrics: "Pediatrics",
        ortho: "Orthopedics",
        neuro: "Neurology",
        dental: "General Dentistry",
        emergency: "Emergency Medicine",
      };
      const specialty = categoryMap[category];
      if (specialty) {
        setSelectedSpecialty(specialty as any);
        setSearchQuery("");
        setSearchTerm("");
        refreshProviders();
      }
    }
  }, [location.search, setSearchQuery, setSearchTerm, setSelectedSpecialty, refreshProviders]);

  return (
    <>
      <Helmet>
        <title>Find Doctors & Specialists | Doc&apos; O Clock</title>
        <meta name="description" content="Search and book appointments with verified doctors, specialists, hospitals, and clinics." />
        <link rel="canonical" href="https://doc0clock.online/search" />
      </Helmet>

      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
        {/* Sticky Monday Search Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
          <div className="max-w-[1500px] mx-auto space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  Healthcare Provider Search Board
                  <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
                </h1>
                <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                  Locate verified specialists, hospitals, pharmacies, and telemedicine practitioners
                </p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative max-w-3xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#676879] h-4 w-4" />
              <input
                type="text"
                placeholder="Search by doctor name, specialty, hospital, city, or medical service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full pl-10 pr-28 py-2.5 rounded-xl border border-[#c3c6d4] bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-[#676879] focus:outline-none focus:ring-2 focus:ring-[#0073ea] shadow-xs"
              />
              <button
                onClick={handleSearch}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-[#0073ea] hover:bg-[#0060c4] text-white text-xs font-extrabold shadow-xs transition-all"
              >
                Search Board
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#e6e9ef] pb-3 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-[#0073ea]" />
              <h2 className="font-extrabold text-xs text-slate-900 uppercase">Provider Filters</h2>
            </div>
            <SearchFilters />
          </div>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <SearchResults />
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchPage;
