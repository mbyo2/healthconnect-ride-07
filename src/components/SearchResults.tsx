
import React, { useEffect, useCallback, memo } from "react";
import { ProviderList } from "@/components/ProviderList";
import ProviderMap from "@/components/ProviderMap";
import { useSearch } from "@/context/SearchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchPagination } from "@/components/SearchPagination";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

// Memoized map component to prevent unnecessary re-renders
const MemoizedProviderMap = memo(ProviderMap);

export const SearchResults = () => {
  const { providers, isLoading, userLocation, maxDistance, totalCount, searchTerm } = useSearch();
  const { speak } = useVoiceCommands();
  
  // Announce search results when loaded
  useEffect(() => {
    if (!isLoading && speak && providers.length > 0) {
      const searchDescription = searchTerm ? `for "${searchTerm}"` : "";
      speak(`Found ${providers.length} healthcare providers ${searchDescription}. Viewing results 1 to ${Math.min(providers.length, 10)} of ${totalCount} total.`);
    }
  }, [isLoading, providers.length, speak, searchTerm, totalCount]);
  
  // Memoized read results handler
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {providers.length > 0 
            ? `${totalCount} Results ${searchTerm ? `for "${searchTerm}"` : ""}`
            : "No Results Found"}
        </h2>
        
        {providers.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReadResults}
            className="flex items-center gap-1"
            aria-label="Read results aloud"
          >
            <Volume2 className="h-4 w-4" />
            Read Results
          </Button>
        )}
      </div>
      
      <MemoizedProviderMap 
        providers={providers} 
        userLocation={userLocation}
        maxDistance={maxDistance}
      />
      
      <ProviderList providers={providers} />
      
      <SearchPagination />
    </div>
  );
};
