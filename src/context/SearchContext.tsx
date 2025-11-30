import React, { createContext, useState, useContext, useEffect } from 'react';
import { HealthcareProviderType, InsuranceProvider, SpecialtyType } from '@/types/healthcare';
import type { Provider } from '@/types/provider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

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
  // State variables
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

  const { user } = useAuth();

  // Get user location effect
  useEffect(() => {
    if (useUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          console.error('Error getting location:', error);
          setUseUserLocation(false);
        }
      );
    }
  }, [useUserLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  const stringToInsuranceProvider = (insuranceStrings: string[] | null): InsuranceProvider[] => {
    if (!insuranceStrings || !Array.isArray(insuranceStrings)) return [];
    return insuranceStrings
      .filter(ins => Object.values(InsuranceProvider).includes(ins as any))
      .map(ins => {
        const found = Object.values(InsuranceProvider).find(val => val === ins);
        return (found as InsuranceProvider) ?? InsuranceProvider.NONE;
      });
  };

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
        console.error('Supabase error:', error);
        throw error;
      }

      const mappedProviders: Provider[] = (data ?? []).map(profile => ({
        id: profile.id,
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        specialty: profile.specialty ?? 'General Practice',
        bio: profile.bio ?? '',
        provider_type: profile.provider_type ?? 'doctor',
        avatar_url: profile.avatar_url,
        accepted_insurances: stringToInsuranceProvider(profile.accepted_insurances),
        expertise: profile.specialty ? [profile.specialty, 'Healthcare'] : ['General Practice'],
        location: profile.provider_locations?.[0]
          ? {
            latitude: Number(profile.provider_locations[0].latitude),
            longitude: Number(profile.provider_locations[0].longitude),
          }
          : null,
        distance:
          userLocation && profile.provider_locations?.[0]
            ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              Number(profile.provider_locations[0].latitude),
              Number(profile.provider_locations[0].longitude)
            )
            : undefined,
      }));

      setProviders(mappedProviders);
      setTotalCount(count || mappedProviders.length);
      setHasMore((count || 0) > currentPage * 10);

      // Log search action
      if (user?.id) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'search',
          resource: 'provider',
          resource_id: null,
          details: { query: searchQuery },
          ip_address: null,
          user_agent: navigator.userAgent,
          severity: 'info',
          category: 'data_access',
          outcome: 'success',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
      setProviders([]);
      setTotalCount(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProviders = () => {
    setCurrentPage(1);
    fetchProviders();
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  // Refetch when page changes
  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

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
    loadMore,
  };

  return <SearchContext.Provider value={contextValue}>{children}</SearchContext.Provider>;
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
