import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderCard } from "./ProviderCard";
import { Provider } from "@/types/provider";

export const ProviderList = () => {
  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'health_personnel');
      
      if (error) throw error;
      return data as Provider[];
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