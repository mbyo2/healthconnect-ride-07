
import React, { useEffect, useCallback, memo } from "react";
import { ProviderList } from "@/components/ProviderList";
import ProviderMap from "@/components/ProviderMap";
import { useSearch } from "@/context/SearchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchPagination } from "@/components/SearchPagination";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { Button } from "@/components/ui/button";
import { Volume2, MapPin, List } from "lucide-react";
import { useState } from "react";

const MemoizedProviderMap = memo(ProviderMap);

export const SearchResults = () => {
  const { providers, isLoading, userLocation, maxDistance, totalCount, searchTerm } = useSearch();
  const { speak } = useVoiceCommands();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  useEffect(() => {
    if (!isLoading && speak && providers.length > 0) {
      const searchDescription = searchTerm ? `for "${searchTerm}"` : "";
      speak(`Found ${providers.length} healthcare providers ${searchDescription}. Viewing results 1 to ${Math.min(providers.length, 10)} of ${totalCount} total.`);
    }
  }, [isLoading, providers.length, speak, searchTerm, totalCount]);
  
  const handleReadResults = useCallback(() => {
    if (speak && providers.length > 0) {
      const providerSummaries = providers.slice(0, 5).map(provider => 
        `${provider.first_name} ${provider.last_name}, ${provider.specialty}, ${provider.distance} kilometers away`
      ).join(". Next, ");
      
      speak(`Top results: ${providerSummaries}${providers.length > 5 ? ". There are more results available." : ""}`);
    } else if (speak) {
      speak("No healthcare providers found matching your search criteria.");
    }
  }, [speak, providers]);

  if (isLoading && providers.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with simple controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-trust-900 dark:text-trust-100">
            {providers.length > 0 
              ? `${totalCount} Healthcare Providers`
              : "No Providers Found"}
          </h2>
          {searchTerm && (
            <p className="text-trust-600 dark:text-trust-400 mt-1">
              Results for "{searchTerm}"
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-trust-100 dark:bg-trust-900/20 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-trust-800 text-trust-700 dark:text-trust-200 shadow-sm'
                  : 'text-trust-600 dark:text-trust-400 hover:text-trust-700 dark:hover:text-trust-300'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-trust-800 text-trust-700 dark:text-trust-200 shadow-sm'
                  : 'text-trust-600 dark:text-trust-400 hover:text-trust-700 dark:hover:text-trust-300'
              }`}
            >
              <MapPin className="h-4 w-4" />
              Map
            </button>
          </div>
          
          {/* Read Results Button */}
          {providers.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReadResults}
              className="flex items-center gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Read Results
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      {viewMode === 'map' ? (
        <div className="trust-card p-1 rounded-xl">
          <MemoizedProviderMap 
            providers={providers} 
            userLocation={userLocation}
            maxDistance={maxDistance}
          />
        </div>
      ) : (
        <ProviderList providers={providers} />
      )}
      
      {providers.length > 0 && <SearchPagination />}
    </div>
  );
};
