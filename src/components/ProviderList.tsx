import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderCard } from "./ProviderCard";
import { Provider } from "@/types/provider";

export const ProviderList = () => {
  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      console.log('Fetching providers with location data');
      const { data, error } = await supabase
        .from('profiles')
        .select('*, location:provider_locations(*)')
        .eq('role', 'health_personnel');
      
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
        latitude: profile.location?.[0]?.latitude,
        longitude: profile.location?.[0]?.longitude,
        expertise: ['General Medicine', 'Primary Care']
      }));
    }
  });

  if (isLoading) {
    return <div>Loading providers...</div>;
  }

  if (!providers || providers.length === 0) {
    return <div>No providers found</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
};