
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQuery, QueryFunctionContext } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Provider } from '@/types/provider';
import { HealthcareProviderType, InsuranceProvider, SpecialtyType } from '@/types/healthcare';
import { toast } from 'sonner';

const DEFAULT_COORDINATES = {
  latitude: -15.3875,
  longitude: 28.3228
};

const PAGE_SIZE = 10;

type SearchContextType = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedType: HealthcareProviderType | null;
  setSelectedType: (type: HealthcareProviderType | null) => void;
  selectedSpecialty: SpecialtyType | null;
  setSelectedSpecialty: (specialty: SpecialtyType | null) => void;
  selectedInsurance: InsuranceProvider | null;
  setSelectedInsurance: (insurance: InsuranceProvider | null) => void;
  maxDistance: number;
  setMaxDistance: (distance: number) => void;
  userLocation: { latitude: number; longitude: number };
  setUserLocation: (location: { latitude: number; longitude: number }) => void;
  useUserLocation: boolean;
  setUseUserLocation: (use: boolean) => void;
  providers: Provider[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  currentPage: number;
  totalCount: number;
  refreshProviders: () => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
};

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<HealthcareProviderType | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyType | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceProvider | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDINATES);
  const [useUserLocation, setUseUserLocation] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  React.useEffect(() => {
    if (navigator.geolocation && useUserLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success("Using your current location for distance calculations");
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get your location. Using default location.");
        }
      );
    }
  }, [useUserLocation]);

  const fetchProviders = useCallback(async (context: QueryFunctionContext) => {
    try {
      const { queryKey } = context;
      const [_, searchTermLocal, typeLocal, distanceLocal, locationLocal, page, specialtyLocal, insuranceLocal] = queryKey as [
        string, 
        string, 
        HealthcareProviderType | null, 
        number, 
        { latitude: number; longitude: number }, 
        number,
        SpecialtyType | null,
        InsuranceProvider | null
      ];
      
      let countQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'health_personnel');

      if (searchTermLocal) {
        countQuery = countQuery.or(`first_name.ilike.%${searchTermLocal}%,last_name.ilike.%${searchTermLocal}%,specialty.ilike.%${searchTermLocal}%`);
      }

      if (typeLocal) {
        countQuery = countQuery.eq('provider_type', typeLocal);
      }
      
      if (specialtyLocal) {
        countQuery = countQuery.eq('specialty', specialtyLocal);
      }
      
      if (insuranceLocal) {
        countQuery = countQuery.contains('accepted_insurances', [insuranceLocal]);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("Count error:", countError);
        toast.error("Failed to count providers: " + countError.message);
        throw countError;
      }

      setTotalCount(count || 0);

      let query = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          bio,
          avatar_url,
          provider_type,
          accepted_insurances,
          provider_locations (
            latitude,
            longitude
          )
        `)
        .eq('role', 'health_personnel')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (searchTermLocal) {
        query = query.or(`first_name.ilike.%${searchTermLocal}%,last_name.ilike.%${searchTermLocal}%,specialty.ilike.%${searchTermLocal}%`);
      }

      if (typeLocal) {
        query = query.eq('provider_type', typeLocal);
      }
      
      if (specialtyLocal) {
        query = query.eq('specialty', specialtyLocal);
      }
      
      if (insuranceLocal) {
        query = query.contains('accepted_insurances', [insuranceLocal]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Query error:", error);
        toast.error("Failed to fetch providers: " + error.message);
        throw error;
      }

      if (!data) {
        return [];
      }

      const processedProviders = data.map((profile: any): Provider => {
        const providerLocation = profile.provider_locations?.[0] ? {
          latitude: Number(profile.provider_locations[0].latitude) || DEFAULT_COORDINATES.latitude,
          longitude: Number(profile.provider_locations[0].longitude) || DEFAULT_COORDINATES.longitude
        } : DEFAULT_COORDINATES;
        
        const distance = calculateDistance(
          locationLocal.latitude,
          locationLocal.longitude,
          providerLocation.latitude,
          providerLocation.longitude
        );

        return {
          id: profile.id,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          specialty: profile.specialty || 'General Practice',
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          provider_type: profile.provider_type,
          accepted_insurances: profile.accepted_insurances || [],
          expertise: ['General Medicine', 'Primary Care'],
          location: providerLocation,
          rating: 4.5, // Hardcoded for now
          distance: parseFloat(distance.toFixed(1))
        };
      });

      const filteredProviders = processedProviders.filter(provider => 
        distanceLocal === 50 || provider.distance <= distanceLocal
      ).sort((a, b) => (a.distance || 999) - (b.distance || 999));
      
      setHasMore(count ? page * PAGE_SIZE < count : false);
      
      return filteredProviders;
    } catch (error) {
      console.error("Fetch providers error:", error);
      toast.error("An error occurred while fetching providers");
      return [];
    }
  }, []);

  const { 
    data: providers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['providers', searchTerm, selectedType, maxDistance, userLocation, currentPage, selectedSpecialty, selectedInsurance],
    queryFn: fetchProviders,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [isLoading, hasMore]);

  const refreshProviders = useCallback(() => {
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  return (
    <SearchContext.Provider
      value={{
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
        userLocation,
        setUserLocation,
        useUserLocation,
        setUseUserLocation,
        providers,
        isLoading,
        hasMore,
        loadMore,
        currentPage,
        totalCount,
        refreshProviders,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
