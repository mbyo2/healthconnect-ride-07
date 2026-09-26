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
    const specialtyParam = urlParams.get("specialty");

    if (query) {
      setSearchQuery(query);
      setSearchTerm(query);
      refreshProviders();
    } else if (specialtyParam) {
      // Specialty cards on /home link /search?specialty=Cardiology — honor it
      // directly instead of landing on an unfiltered list.
      setSelectedSpecialty(specialtyParam as any);
      setSearchQuery("");
      setSearchTerm("");
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

      <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
        {/* Search Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
          <div className="max-w-content mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                  Find a Doctor
                  <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
                </h1>
                <p className="text-sm text-graphite-500 font-medium tracking-wide">
                  Locate verified specialists, hospitals, pharmacies, and telemedicine practitioners
                </p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative max-w-3xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by doctor name, specialty, hospital, city, or medical service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full pl-11 pr-28 py-3 rounded-pill border border-canvas-silk dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-midnight placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                aria-label="Search providers"
              />
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 vf-btn-primary text-sm min-h-[40px] disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div className="vf-card">
            <div className="flex items-center gap-2 border-b border-canvas-silk pb-3 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-primary-500" />
              <h2 className="font-medium text-base text-midnight">Provider Filters</h2>
            </div>
            <SearchFilters />
          </div>

          <div className="vf-card">
            <SearchResults />
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchPage;
