
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
import { useNavigate, useSearchParams } from "react-router-dom";

const MemoizedProviderMap = memo(ProviderMap);

export const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { providers, isLoading, userLocation, maxDistance, totalCount, searchTerm, setSearchTerm, setSearchQuery, setSelectedSpecialty, refreshProviders } = useSearch();
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
      const providerSummaries = providers.slice(0, 5).map(provider => {
        const distancePart = provider.distance !== undefined ? `, ${provider.distance.toFixed(1)} kilometres away` : "";
        const feePart = provider.consultation_fee_min
          ? `, consultation fee from ${provider.consultation_fee_min} kwacha`
          : provider.consultation_fee
          ? `, consultation fee ${provider.consultation_fee} kwacha`
          : "";
        const telemedPart = provider.telemedicine_available ? ", telemedicine available" : "";
        const waitPart = provider.typical_wait_time ? `, typical wait ${provider.typical_wait_time}` : "";
        return `${provider.first_name} ${provider.last_name}, ${provider.specialty}${distancePart}${feePart}${telemedPart}${waitPart}`;
      }).join(". Next, ");

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
          <h2 className="text-2xl font-bold text-midnight">
            {providers.length > 0 
              ? `${totalCount} Healthcare Providers`
              : "No Providers Found"}
          </h2>
          {searchTerm ? (
            <p className="text-graphite-500 mt-1">
              Results for "{searchTerm}"
            </p>
          ) : providers.length === 0 && (
            <p className="text-graphite-500 mt-1">
              Try a different search or browse all doctors below.
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
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
              onClick={handleReadResults}
              className="flex items-center gap-2 h-11"
            >
              <Volume2 className="h-4 w-4" />
              Read Results
            </Button>
          )}
        </div>
      </div>
      
      {/* Empty state actions */}
      {!isLoading && providers.length === 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-8 text-center">
          <button
            onClick={() => {
              setSearchTerm("");
              setSearchQuery("");
              setSelectedSpecialty(null);
              refreshProviders();
            }}
            className="vf-btn-primary min-h-[44px]"
          >
            Browse all doctors
          </button>
          <button
            onClick={() => {
              setSearchTerm("");
              setSearchQuery("");
              refreshProviders();
            }}
            className="vf-btn-secondary min-h-[44px]"
          >
            Clear search and try again
          </button>
        </div>
      )}

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
        <ProviderList
          providers={providers}
          onProviderSelect={(p) => {
            // Preserve the telehealth context (?mode=online) so the booking
            // modal preselects the virtual appointment type.
            const mode = searchParams.get("mode");
            navigate(`/provider/${p.id}${mode ? `?mode=${mode}` : ""}`);
          }}
        />
      )}
      
      {providers.length > 0 && <SearchPagination />}
    </div>
  );
};
