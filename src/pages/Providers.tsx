
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ProviderList } from '@/components/ProviderList';
import { SearchFilters } from '@/components/SearchFilters';
import { SearchPagination } from '@/components/SearchPagination';
import { supabase } from '@/integrations/supabase/client';

// Define Provider interface correctly
interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  bio: string;
  avatar_url: string;
  location: { 
    latitude: number; 
    longitude: number; 
  };
  rating: number;
}

interface FiltersState {
  specialty: string;
  location: string;
  availability: string;
  rating: number;
  searchTerm: string;
}

const Providers = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FiltersState>({
    specialty: '',
    location: '',
    availability: '',
    rating: 0,
    searchTerm: ''
  });

  useEffect(() => {
    fetchProviders();
  }, [currentPage, filters]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      // Start building the query
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'provider');
      
      // Apply filters if they exist
      if (filters.specialty) {
        query = query.eq('specialty', filters.specialty);
      }
      
      if (filters.rating > 0) {
        query = query.gte('rating', filters.rating);
      }
      
      if (filters.searchTerm) {
        query = query.or(
          `first_name.ilike.%${filters.searchTerm}%,last_name.ilike.%${filters.searchTerm}%,specialty.ilike.%${filters.searchTerm}%`
        );
      }
      
      // Add pagination
      const from = (currentPage - 1) * 10;
      const to = from + 9;
      query = query.range(from, to);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Process and set provider data
      if (data && Array.isArray(data)) {
        const formattedProviders = data.map(provider => ({
          id: provider.id,
          first_name: provider.first_name || '',
          last_name: provider.last_name || '',
          specialty: provider.specialty || '',
          bio: provider.bio || '',
          avatar_url: provider.avatar_url || '',
          location: { 
            latitude: 0, // These would come from a join or separate query in reality
            longitude: 0
          },
          rating: 4.5 // Placeholder rating
        }));
        
        setProviders(formattedProviders);
        
        // Calculate total pages
        if (count) {
          setTotalPages(Math.ceil(count / 10));
        }
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-24">
        <h1 className="text-2xl font-bold mb-6">Healthcare Providers</h1>
        
        <div className="mb-6">
          <SearchFilters 
            currentFilters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
        
        <div className="mb-6">
          <ProviderList 
            providers={providers} 
            loading={loading} 
          />
        </div>
        
        <SearchPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  );
};

export default Providers;
