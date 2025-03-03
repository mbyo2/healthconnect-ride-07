
import React from "react";
import { ProviderList } from "@/components/ProviderList";
import ProviderMap from "@/components/ProviderMap";
import { useSearch } from "@/context/SearchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchPagination } from "@/components/SearchPagination";

export const SearchResults = () => {
  const { providers, isLoading, userLocation, maxDistance } = useSearch();

  if (isLoading && providers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-[300px] bg-muted rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProviderMap 
        providers={providers} 
        userLocation={userLocation}
        maxDistance={maxDistance}
      />
      
      <ProviderList providers={providers} />
      
      <SearchPagination />
    </div>
  );
};
