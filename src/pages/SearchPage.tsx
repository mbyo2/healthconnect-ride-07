import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSearch } from "@/context/SearchContext";
import { SearchResults } from "@/components/SearchResults";
import { SearchFilters } from "@/components/SearchFilters";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";

const SearchPage = () => {
  const { searchQuery, setSearchQuery, setSearchTerm, setSelectedSpecialty, refreshProviders } = useSearch();
  const { showSuccess } = useSuccessFeedback();
  const location = useLocation();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchTerm(searchQuery);
      refreshProviders();
      showSuccess({ message: `Searching for "${searchQuery}"` });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    // Get search query from URL params if coming from header search
    const urlParams = new URLSearchParams(location.search);
    const query = urlParams.get('q');
    const category = urlParams.get('category');

    if (query) {
      setSearchQuery(query);
      setSearchTerm(query);
      refreshProviders();
    } else if (category) {
      // Map category ID to SpecialtyType
      const categoryMap: Record<string, string> = {
        'skin': 'Dermatology',
        'heart': 'Cardiology',
        'mental': 'Psychiatry',
        'pediatrics': 'Pediatrics',
        'ortho': 'Orthopedics',
        'neuro': 'Neurology',
        'dental': 'General Dentistry',
        'emergency': 'Emergency Medicine'
      };

      const specialty = categoryMap[category];
      if (specialty) {
        setSelectedSpecialty(specialty as any);
        setSearchQuery("");
        setSearchTerm("");
        refreshProviders();
      }
    }
  }, [location, setSearchQuery, setSearchTerm, setSelectedSpecialty, refreshProviders]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-trust-600 to-trust-400 bg-clip-text text-transparent">
            Find Care
          </h1>
          <p className="text-muted-foreground">
            Search for doctors, hospitals, and clinics near you
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search doctors, specialties, hospitals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 h-12 border-trust-200 focus:border-trust-400"
          />
          <Button
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <SearchFilters />

      {/* Search Results */}
      <SearchResults />
    </div>
  );
};

export default SearchPage;