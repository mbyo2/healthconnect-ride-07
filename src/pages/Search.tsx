import { useState } from "react";
import { ProviderList } from "@/components/ProviderList";
import { ProviderMap } from "@/components/ProviderMap";
import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Provider } from "@/types/provider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { HealthcareProviderType } from "@/types/healthcare";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<HealthcareProviderType | "">("");
  const isMobile = useIsMobile();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers', searchTerm, selectedType],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          bio,
          avatar_url,
          provider_type,
          provider_locations (
            latitude,
            longitude
          )
        `)
        .eq('role', 'health_personnel');

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%`);
      }

      if (selectedType) {
        query = query.eq('provider_type', selectedType);
      }

      const { data, error } = await query;

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
          latitude: profile.provider_locations?.[0]?.latitude || -15.3875,
          longitude: profile.provider_locations?.[0]?.longitude || 28.3228
        }
      }));
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <h1 className="text-2xl font-bold">Find Healthcare Providers</h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedType} onValueChange={(value: HealthcareProviderType | "") => setSelectedType(value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Provider type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="dentist">Dentists</SelectItem>
                <SelectItem value="nurse">Nurses</SelectItem>
                <SelectItem value="pharmacy">Pharmacies</SelectItem>
                <SelectItem value="hospital">Hospitals</SelectItem>
                <SelectItem value="clinic">Clinics</SelectItem>
                <SelectItem value="nursing_home">Nursing Homes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isMobile ? (
          <ProviderList providers={providers} />
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="order-2 lg:order-1">
              <ProviderList providers={providers} />
            </div>
            <div className="order-1 lg:order-2">
              <ProviderMap />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;