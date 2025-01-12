import { useState } from 'react';
import { ProviderMap } from '@/components/ProviderMap';
import { ProviderList } from '@/components/ProviderList';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Provider {
  id: string;
  name: string;
  specialty: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

const MapPage = () => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      console.log('Fetching providers for map');
      const { data, error } = await supabase
        .from('profiles')
        .select('*, location:provider_locations(*)')
        .eq('role', 'health_personnel');
      
      if (error) {
        console.error('Error fetching providers for map:', error);
        throw error;
      }
      
      return data.map((profile): Provider => ({
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        specialty: profile.specialty || 'General Practice',
        location: {
          latitude: profile.location?.[0]?.latitude ? Number(profile.location[0].latitude) : 37.7749,
          longitude: profile.location?.[0]?.longitude ? Number(profile.location[0].longitude) : -122.4194
        }
      }));
    }
  });

  const handleProviderSelect = (provider: Provider) => {
    console.log('Provider selected:', provider);
    setSelectedProvider(provider);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Find Healthcare Providers</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <ProviderMap 
            providers={providers} 
            onProviderSelect={handleProviderSelect}
          />
        </div>
        <div>
          <ProviderList />
        </div>
      </div>
    </div>
  );
};

export default MapPage;