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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'health_personnel');
      
      if (error) throw error;
      
      return data.map((profile): Provider => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        specialty: profile.specialty || 'General Practice',
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        expertise: ['General Medicine', 'Primary Care']
      }));
    }
  });

  const handleMarkerClick = (provider: Provider) => {
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