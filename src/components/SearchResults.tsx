
import React, { useEffect, useCallback, memo } from "react";
import { ProviderList } from "@/components/ProviderList";
import ProviderMap from "@/components/ProviderMap";
import { useSearch } from "@/context/SearchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonProviderCard } from "@/components/ui/skeleton-kit";
import { SearchPagination } from "@/components/SearchPagination";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { Button } from "@/components/ui/button";
import { Volume2, MapPin, List } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const MemoizedProviderMap = memo(ProviderMap);

export const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { providers, isLoading, userLocation, maxDistance, totalCount, searchTerm, setSearchTerm, setSearchQuery, setSelectedSpecialty, refreshProviders } = useSearch();
  const { speak } = useVoiceCommands();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'fee-low' | 'fee-high'>('recommended');

  // Client-side sort on a copy — default keeps the server order untouched.
  // Result objects already carry rating + fee fields, so this is safe.
  const feeOf = (p: any): number | null =>
    p.consultation_fee_min ?? p.consultation_fee ?? p.consultation_fee_max ?? null;
  const sortedProviders = useMemo(() => {
    if (sortBy === 'recommended') return providers;
    const copy = [...providers];
    if (sortBy === 'rating') {
      copy.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === 'fee-low') {
      copy.sort((a, b) => (feeOf(a) ?? Number.POSITIVE_INFINITY) - (feeOf(b) ?? Number.POSITIVE_INFINITY));
    } else if (sortBy === 'fee-high') {
      copy.sort((a, b) => (feeOf(b) ?? Number.NEGATIVE_INFINITY) - (feeOf(a) ?? Number.NEGATIVE_INFINITY));
    }
    return copy;
  }, [providers, sortBy]);
  
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
      <div className="space-y-6" role="status" aria-label="Loading providers">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonProviderCard key={i} />
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
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-midnight">
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
          <div className="flex bg-canvas-bone border border-canvas-silk rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-midnight shadow-sm'
                  : 'text-graphite-500 hover:text-midnight'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-900 text-midnight shadow-sm'
                  : 'text-graphite-500 hover:text-midnight'
              }`}
            >
              <MapPin className="h-4 w-4" />
              Map
            </button>
          </div>
          
          {/* Sort */}
          {providers.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-medium text-graphite-600">
              <span className="sr-only">Sort results</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-11 rounded-pill border border-canvas-silk bg-white dark:bg-slate-900 px-3 text-sm font-medium text-midnight focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Highest rated</option>
                <option value="fee-low">Lowest fee</option>
                <option value="fee-high">Highest fee</option>
              </select>
            </label>
          )}

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
      
      {/* Content */}
      {viewMode === 'map' ? (
        <div className="trust-card p-1 rounded-xl">
          <MemoizedProviderMap
            providers={sortedProviders}
            userLocation={userLocation}
            maxDistance={maxDistance}
          />
        </div>
      ) : (
        <ProviderList
          providers={sortedProviders}
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
