import { ProviderCard } from "./ProviderCard";
import { Input } from "@/components/ui/input";
import { Search, MapPin, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ProviderMap } from "./ProviderMap";
import { Provider } from "@/types/provider";
import { SearchFilters } from "@/types/search";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ProviderListProps {
  symptoms?: string;
  urgency?: string;
}

const specialties = [
  "General Practice",
  "Emergency Medicine",
  "Family Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
];

const fetchProviders = async (filters: SearchFilters) => {
  console.log("Fetching providers with filters:", filters);
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'health_personnel');

  // Apply filters
  if (filters.specialty) {
    query = query.ilike('specialty', `%${filters.specialty}%`);
  }

  if (filters.availability === 'now') {
    // Add availability logic here
  }

  const { data, error } = await query;
  
  if (error) throw error;

  // Transform profiles into Provider type
  return (data || []).map(profile => ({
    id: profile.id,
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    specialty: profile.specialty || 'General Practice',
    rating: 4.5, // Placeholder - you might want to fetch this from a ratings table
    location: [40.7128, -74.0060], // Placeholder - you might want to add location columns to profiles
    availability: 'Available Now', // Placeholder
    expertise: ['General Medicine'],
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zip_code: profile.zip_code
  })) as Provider[];
};

const fetchHealthcareServices = async () => {
  const { data, error } = await supabase
    .from('healthcare_services')
    .select('*')
    .eq('is_available', true);

  if (error) throw error;
  return data;
};

export const ProviderList = ({ symptoms = "", urgency = "non-urgent" }: ProviderListProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    specialty: undefined,
    availability: undefined,
    priceRange: { min: 0, max: 500 },
    rating: undefined,
    distance: undefined,
    serviceTypes: [],
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers', filters],
    queryFn: () => fetchProviders(filters),
  });

  const { data: services } = useQuery({
    queryKey: ['healthcare-services'],
    queryFn: fetchHealthcareServices,
  });

  const filteredProviders = providers?.filter(provider =>
    searchTerm
      ? provider.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 z-40 bg-white border-b px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search for healthcare providers..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Providers</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-4">
                  <Label>Specialty</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {specialties.map((specialty) => (
                      <div key={specialty} className="flex items-center space-x-2">
                        <Checkbox
                          id={specialty}
                          checked={filters.specialty === specialty}
                          onCheckedChange={(checked) =>
                            setFilters(prev => ({
                              ...prev,
                              specialty: checked ? specialty : undefined
                            }))
                          }
                        />
                        <label htmlFor={specialty} className="text-sm">
                          {specialty}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Price Range</Label>
                  <Slider
                    defaultValue={[filters.priceRange?.min || 0]}
                    max={500}
                    step={10}
                    onValueChange={([value]) =>
                      setFilters(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange!, min: value }
                      }))
                    }
                  />
                  <div className="text-sm text-gray-500">
                    ${filters.priceRange?.min} - ${filters.priceRange?.max}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Availability</Label>
                  <div className="flex gap-2">
                    <Badge
                      variant={filters.availability === 'now' ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          availability: prev.availability === 'now' ? undefined : 'now'
                        }))
                      }
                    >
                      Available Now
                    </Badge>
                    <Badge
                      variant={filters.availability === 'today' ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          availability: prev.availability === 'today' ? undefined : 'today'
                        }))
                      }
                    >
                      Available Today
                    </Badge>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            onClick={() => setViewMode('map')}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Map
          </Button>
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[calc(100vh-8.5rem)]">
            <ProviderMap providers={filteredProviders || []} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProviders?.map((provider) => (
              <ProviderCard key={provider.id} {...provider} />
            ))}
            {filteredProviders?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No providers found matching your criteria
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
