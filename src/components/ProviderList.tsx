import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderCard } from "./ProviderCard";
import { Skeleton } from "./ui/skeleton";
import { Provider } from "@/types/provider";

export const ProviderList = () => {
  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, specialty')
        .eq('role', 'health_personnel');
      
      if (error) throw error;
      
      return data.map((profile): Provider => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        specialty: profile.specialty || 'General Practice',
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        location: [51.505, -0.09], // Default location for demo
        expertise: ['General Medicine', 'Primary Care'],
        name: `${profile.first_name || ''} ${profile.last_name || ''}` // Add name field
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
        <ProviderCard key={provider.id} {...provider} />
      ))}
    </div>
  );
};