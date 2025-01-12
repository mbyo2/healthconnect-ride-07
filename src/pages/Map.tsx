import { useState } from 'react';
import { ProviderMap } from '@/components/ProviderMap';
import { ProviderList } from '@/components/ProviderList';
import { Provider } from '@/types/provider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  const handleMarkerClick = (provider: Provider) => {
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
            onMarkerClick={handleMarkerClick}
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