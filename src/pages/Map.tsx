
import { useState } from 'react';
import ProviderMap from '@/components/ProviderMap';
import { ProviderList } from '@/components/ProviderList';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Provider, MapProvider } from '@/types/provider';
import type { LatLngTuple } from 'leaflet';

const MapPage = () => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          bio,
          avatar_url,
          provider_locations (
            latitude,
            longitude
          )
        `)
        .eq('role', 'health_personnel');

      if (error) throw error;

      return data.map((profile): Provider => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        specialty: profile.specialty || 'General Practice',
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        expertise: ['General Medicine', 'Primary Care'],
        location: profile.provider_locations?.[0] ? {
          latitude: profile.provider_locations[0].latitude ? Number(profile.provider_locations[0].latitude) : 37.7749,
          longitude: profile.provider_locations[0].longitude ? Number(profile.provider_locations[0].longitude) : -122.4194
        } : {
          latitude: 37.7749,
          longitude: -122.4194
        }
      }));
    }
  });

  const mapProviders: MapProvider[] = providers.map(p => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    specialty: p.specialty,
    location: p.location ? [p.location.latitude, p.location.longitude] as LatLngTuple : [-15.3875, 28.3228] as LatLngTuple,
    rating: 4.5 // This is hardcoded for now, you might want to fetch this from a ratings table
  }));

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Find Healthcare Providers</h1>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="order-2 lg:order-1">
          <ProviderList
            providers={providers}
            selectedProvider={selectedProvider}
            onProviderSelect={setSelectedProvider}
          />
        </div>
        <div className="order-1 lg:order-2">
          <ProviderMap providers={providers} />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
