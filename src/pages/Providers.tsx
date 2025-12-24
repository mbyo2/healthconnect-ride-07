
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
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

interface SearchFiltersProps {
  currentFilters: FiltersState;
  onFilterChange: (newFilters: FiltersState) => void;
}

// Define missing component interfaces
const SearchFilters = ({ currentFilters, onFilterChange }: SearchFiltersProps) => {
  return (
    <div className="bg-card p-4 rounded-md shadow mb-4 border">
      <h3 className="font-semibold mb-2">Filter Healthcare Providers</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by name or specialty"
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
          value={currentFilters.searchTerm}
          onChange={(e) => onFilterChange({ ...currentFilters, searchTerm: e.target.value })}
        />

        <select
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
          value={currentFilters.specialty}
          onChange={(e) => onFilterChange({ ...currentFilters, specialty: e.target.value })}
        >
          <option value="">Any Specialty</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Dermatology">Dermatology</option>
          <option value="Pediatrics">Pediatrics</option>
          <option value="Family Medicine">Family Medicine</option>
          <option value="Neurology">Neurology</option>
        </select>

        <select
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
          value={currentFilters.rating.toString()}
          onChange={(e) => onFilterChange({ ...currentFilters, rating: Number(e.target.value) })}
        >
          <option value="0">Any Rating</option>
          <option value="3">3+ Stars</option>
          <option value="4">4+ Stars</option>
          <option value="4.5">4.5+ Stars</option>
        </select>
      </div>
    </div>
  );
};

interface ProviderListProps {
  providers: Provider[];
  loading: boolean;
}

const ProviderList = ({ providers, loading }: ProviderListProps) => {
  if (loading) {
    return <div className="flex justify-center py-12">Loading providers...</div>;
  }

  if (providers.length === 0) {
    return <div className="text-center py-8">No providers match your search criteria</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map(provider => (
        <div key={provider.id} className="bg-card rounded-lg shadow-md overflow-hidden border">
          <div className="p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {provider.avatar_url ? (
                  <img src={provider.avatar_url} alt={`Dr. ${provider.last_name}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{provider.first_name[0]}{provider.last_name[0]}</span>
                )}
              </div>
              <div>
                <h3 className="font-semibold">Dr. {provider.first_name} {provider.last_name}</h3>
                <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                  <div className="flex ml-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-4 h-4 ${i < Math.floor(provider.rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm mt-3 line-clamp-2">{provider.bio || 'No biography available.'}</p>

            <div className="mt-4 flex justify-between">
              <button className="text-sm text-primary hover:text-primary/80">View Profile</button>
              <button className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90">Book Now</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const SearchPagination = ({ currentPage, totalPages, onPageChange }: SearchPaginationProps) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center mt-8">
      <nav className="flex space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground disabled:opacity-50"
        >
          Previous
        </button>

        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-md ${currentPage === page ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground disabled:opacity-50"
        >
          Next
        </button>
      </nav>
    </div>
  );
};

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
        .eq('role', 'provider' as any);

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
        // Cast to any to access potential extra fields not in the generated type
        const formattedProviders = (data as any[]).map(provider => ({
          id: provider.id,
          first_name: provider.first_name || '',
          last_name: provider.last_name || '',
          specialty: provider.specialty || 'General Practice',
          bio: provider.bio || '',
          avatar_url: provider.avatar_url || '',
          location: {
            latitude: provider.latitude || 0,
            longitude: provider.longitude || 0
          },
          rating: provider.rating || 0
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
