
import React, { createContext, useState, useContext, useEffect } from 'react';
import { HealthcareProviderType, InsuranceProvider, SpecialtyType } from '@/types/healthcare';
import type { Provider } from '@/types/provider';
import { supabase } from '@/integrations/supabase/client';

type Coordinates = {
  latitude: number;
  longitude: number;
} | null;

type SearchContextType = {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedType: HealthcareProviderType | null;
  setSelectedType: React.Dispatch<React.SetStateAction<HealthcareProviderType | null>>;
  selectedSpecialty: SpecialtyType | null;
  setSelectedSpecialty: React.Dispatch<React.SetStateAction<SpecialtyType | null>>;
  selectedInsurance: InsuranceProvider | null;
  setSelectedInsurance: React.Dispatch<React.SetStateAction<InsuranceProvider | null>>;
  maxDistance: number;
  setMaxDistance: React.Dispatch<React.SetStateAction<number>>;
  useUserLocation: boolean;
  setUseUserLocation: React.Dispatch<React.SetStateAction<boolean>>;
  refreshProviders: () => void;
  providers: Provider[];
  isLoading: boolean;
  userLocation: Coordinates;
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
  loadMore: () => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize all state variables in the correct order
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<HealthcareProviderType | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyType | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceProvider | null>(null);
  const [maxDistance, setMaxDistance] = useState(50);
  const [useUserLocation, setUseUserLocation] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Get user location effect
  useEffect(() => {
    if (useUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setUseUserLocation(false);
        }
      );
    }
  }, [useUserLocation]);

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  };
  const stringToInsuranceProvider = (
    insuranceStrings: string[] | null
  ): InsuranceProvider[] => {
    if (!insuranceStrings || !Array.isArray(insuranceStrings)) {
      return [];
    }
    
    return insuranceStrings
      .filter(insurance => {
        return Object.values(InsuranceProvider).includes(insurance as any);
      })
      .map(insurance => {
        const enumValue = Object.values(InsuranceProvider).find(
          val => val === insurance
        );
        return enumValue || InsuranceProvider.NONE;
      });
  };

  // Fetch providers function
  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          accepted_insurances,
          bio,
          provider_type,
          avatar_url,
          provider_locations (
            latitude,
            longitude
          )
        `, { count: 'exact' })
        .eq('role', 'health_personnel')
        .limit(10)
        .range((currentPage - 1) * 10, currentPage * 10 - 1);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Remove hardcoded expertise and location fallbacks
      const mappedProviders = data?.map((profile): Provider => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        specialty: profile.specialty || 'General Practice',
        bio: profile.bio || '',
        provider_type: profile.provider_type || 'doctor',
        avatar_url: profile.avatar_url,
        accepted_insurances: stringToInsuranceProvider(profile.accepted_insurances),
        expertise: profile.specialty ? [profile.specialty, 'Healthcare'] : ['General Practice'],
        location: profile.provider_locations?.[0] ? {
          latitude: Number(profile.provider_locations[0].latitude),
          longitude: Number(profile.provider_locations[0].longitude)
        } : null,
        distance: userLocation && profile.provider_locations?.[0] ? 
          calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number(profile.provider_locations[0].latitude),
            Number(profile.provider_locations[0].longitude)
          ) : undefined
      })) || [];

      setProviders(mappedProviders);
      setTotalCount(count || mappedProviders.length);
      setHasMore((count || 0) > currentPage * 10);
    } catch (error) {
      console.error("Error fetching providers:", error);
      setProviders([]);
      setTotalCount(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch effect
  useEffect(() => {
    fetchProviders();
  }, [currentPage]);

  const refreshProviders = () => {
    setCurrentPage(1);
    fetchProviders();
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const contextValue: SearchContextType = {
    searchQuery,
    setSearchQuery,
    searchTerm,
    setSearchTerm,
    selectedType,
    setSelectedType,
    selectedSpecialty,
    setSelectedSpecialty,
    selectedInsurance,
    setSelectedInsurance,
    maxDistance,
    setMaxDistance,
    useUserLocation,
    setUseUserLocation,
    refreshProviders,
    providers,
    isLoading,
    userLocation,
    totalCount,
    currentPage,
    hasMore,
    loadMore
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
