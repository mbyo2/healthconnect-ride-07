import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
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
    if (e.key === 'Enter') handleSearch();
  };

  useEffect(() => {
    const searchString = location.search;
    if (lastSearchRef.current === searchString && initializedRef.current) return;
    lastSearchRef.current = searchString;
    initializedRef.current = true;

    const urlParams = new URLSearchParams(searchString);
    const query = urlParams.get('q');
    const category = urlParams.get('category');

    if (query) {
      setSearchQuery(query);
      setSearchTerm(query);
      refreshProviders();
    } else if (category) {
      const categoryMap: Record<string, string> = {
        'skin': 'Dermatology', 'heart': 'Cardiology', 'mental': 'Psychiatry',
        'pediatrics': 'Pediatrics', 'ortho': 'Orthopedics', 'neuro': 'Neurology',
        'dental': 'General Dentistry', 'emergency': 'Emergency Medicine'
      };
      const specialty = categoryMap[category];
      if (specialty) {
        setSelectedSpecialty(specialty as any);
        setSearchQuery(""); setSearchTerm(""); refreshProviders();
      }
    }
  }, [location.search, setSearchQuery, setSearchTerm, setSelectedSpecialty, refreshProviders]);

  return (
    <>
      <Helmet>
        <title>Find Doctors & Specialists in Zambia | Doc' O Clock</title>
        <meta name="description" content="Search and book appointments with verified doctors, specialists, hospitals, and clinics across Zambia." />
        <link rel="canonical" href="https://dococlockapp.com/search" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Find Care</h1>
            <p className="text-sm text-muted-foreground">Search for doctors, hospitals, and clinics near you</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search doctors, specialties, hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 h-12 rounded-xl"
            />
            <Button
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <SearchFilters />
        <SearchResults />
      </div>
    </>
  );
};

export default SearchPage;
