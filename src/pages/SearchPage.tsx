
import { SearchResults } from "@/components/SearchResults";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchPagination } from "@/components/SearchPagination";
import { ProviderMap } from "@/components/ProviderMap";
import { useState } from "react";

const SearchPage = () => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Find Healthcare Providers</h1>
        <p className="text-muted-foreground">
          Search for doctors, specialists, and healthcare facilities near you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <SearchFilters />
        </div>
        
        <div className="lg:col-span-3">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'map'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Map View
            </button>
          </div>
          
          {viewMode === 'list' ? (
            <>
              <SearchResults />
              <SearchPagination />
            </>
          ) : (
            <ProviderMap />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
