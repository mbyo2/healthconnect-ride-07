import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderCard } from "./ProviderCard";
import { Skeleton } from "./ui/skeleton";

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  bio?: string;
  avatar_url?: string;
}

export const ProviderList = () => {
  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'health_personnel');
      
      if (error) throw error;
      
      return data.map((provider): Provider => ({
        id: provider.id,
        first_name: provider.first_name || '',
        last_name: provider.last_name || '',
        specialty: provider.specialty || 'General Practice',
        bio: provider.bio,
        avatar_url: provider.avatar_url
      }));
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers?.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={{
            id: provider.id,
            name: `${provider.first_name} ${provider.last_name}`,
            specialty: provider.specialty || 'General Practice'
          }}
        />
      ))}
    </div>
  );
};