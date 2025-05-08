
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProviderList } from '@/components/ProviderList';
import { SearchFilters } from '@/components/SearchFilters';
import { SearchPagination } from '@/components/SearchPagination';
import { Header } from '@/components/Header';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface SearchFiltersProps {
  currentFilters: {
    specialty: string;
    location: string;
    availability: string;
    rating: number;
    searchTerm: string;
  };
  onFilterChange: (newFilters: any) => void;
}

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  location: string;
  rating: number;
  availability: string;
}

const Providers = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    specialty: '',
    location: '',
    availability: '',
    rating: 0,
    searchTerm: '',
  });
  const pageSize = 10;
  const { isOnline, getOfflineCache, cacheForOffline } = useOfflineMode();

  useEffect(() => {
    fetchProviders();
  }, [page, filters]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      // Try to get cached data when offline
      if (!isOnline) {
        const cachedData = await getOfflineCache('providers');
        if (cachedData) {
          setProviders(cachedData.providers);
          setTotalCount(cachedData.totalCount);
          setLoading(false);
          return;
        } else {
          toast.error("You're offline and no cached data is available");
          setLoading(false);
          return;
        }
      }

      // Build query
      let query = supabase
        .from('health_personnel')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.specialty) {
        query = query.eq('specialty', filters.specialty);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.searchTerm) {
        query = query.or(`first_name.ilike.%${filters.searchTerm}%,last_name.ilike.%${filters.searchTerm}%`);
      }
      if (filters.rating > 0) {
        query = query.gte('rating', filters.rating);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Execute query
      const { data, error, count } = await query;

      if (error) throw error;

      setProviders(data || []);
      setTotalCount(count || 0);
      
      // Cache data for offline use
      await cacheForOffline('providers', { 
        providers: data, 
        totalCount: count,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24">
          <h1 className="text-2xl font-bold mb-6">Healthcare Providers</h1>
          
          <div className="mb-6">
            <SearchFilters currentFilters={filters} onFilterChange={handleFilterChange} />
          </div>

          {loading ? (
            <LoadingScreen />
          ) : (
            <>
              <ProviderList providers={providers} />
              
              {totalCount > pageSize && (
                <div className="mt-8">
                  <SearchPagination 
                    currentPage={page}
                    totalPages={Math.ceil(totalCount / pageSize)}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}

              {providers.length === 0 && !loading && (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium">No providers found</h3>
                  <p className="text-muted-foreground mt-1">Try adjusting your search filters</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Providers;
