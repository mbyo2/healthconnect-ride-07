
import React from "react";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchResults } from "@/components/SearchResults";
import { SearchProvider } from "@/context/SearchContext";

const Search = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 space-y-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Find Healthcare Providers</h1>
          
          <SearchProvider>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <SearchFilters />
              </div>
              <div className="lg:col-span-3">
                <SearchResults />
              </div>
            </div>
          </SearchProvider>
        </div>
      </main>
    </div>
  );
};

export default Search;
