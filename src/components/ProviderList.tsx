import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderCard } from "./ProviderCard";
import { Provider } from "@/types/provider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const ProviderList = () => {
  const [filters, setFilters] = useState({
    specialty: '',
    maxDistance: 50,
    availability: '',
    searchTerm: ''
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers', filters],
    queryFn: async () => {
      console.log('Fetching providers with filters:', filters);
      let query = supabase
        .from('profiles')
        .select('*, location:provider_locations(*)')
        .eq('role', 'health_personnel');

      if (filters.specialty) {
        query = query.eq('specialty', filters.specialty);
      }

      if (filters.availability) {
        query = query.eq('availability', filters.availability);
      }

      if (filters.searchTerm) {
        query = query.or(`first_name.ilike.%${filters.searchTerm}%,last_name.ilike.%${filters.searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching providers:', error);
        throw error;
      }

      return data.map((profile): Provider => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        specialty: profile.specialty || 'General Practice',
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        latitude: profile.location?.[0]?.latitude ? Number(profile.location[0].latitude) : undefined,
        longitude: profile.location?.[0]?.longitude ? Number(profile.location[0].longitude) : undefined,
        expertise: ['General Medicine', 'Primary Care']
      }));
    }
  });

  const specialties = [
    'General Practice',
    'Cardiology',
    'Pediatrics',
    'Dermatology',
    'Orthopedics',
    'Neurology'
  ];

  const availabilityOptions = [
    'Today',
    'This Week',
    'Next Week',
    'Any Time'
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search providers..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Specialty</label>
            <Select
              value={filters.specialty}
              onValueChange={(value) => setFilters({ ...filters, specialty: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Availability</label>
            <Select
              value={filters.availability}
              onValueChange={(value) => setFilters({ ...filters, availability: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Max Distance ({filters.maxDistance}km)</label>
            <Slider
              value={[filters.maxDistance]}
              onValueChange={(value) => setFilters({ ...filters, maxDistance: value[0] })}
              max={100}
              step={5}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading providers...</div>
      ) : !providers || providers.length === 0 ? (
        <div className="text-center py-8">No providers found</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </div>
  );
};