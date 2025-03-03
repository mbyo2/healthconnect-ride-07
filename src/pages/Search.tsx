
import React from "react";
import { Header } from "@/components/Header";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchResults } from "@/components/SearchResults";
import { SearchProvider } from "@/context/SearchContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Search = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 space-y-8">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Find Healthcare Providers</h1>
            
            <SearchProvider>
              <SearchFilters />
              <SearchResults />
            </SearchProvider>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Search;
