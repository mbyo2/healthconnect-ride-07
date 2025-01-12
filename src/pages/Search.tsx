import { ProviderList } from "@/components/ProviderList";
import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Provider } from "@/types/provider";

const Search = () => {
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
        location: {
          latitude: profile.provider_locations?.[0]?.latitude ? Number(profile.provider_locations[0].latitude) : 37.7749,
          longitude: profile.provider_locations?.[0]?.longitude ? Number(profile.provider_locations[0].longitude) : -122.4194
        }
      }));
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14">
        <ProviderList providers={providers} />
      </main>
    </div>
  );
};

export default Search;