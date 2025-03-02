
import { useState, useEffect } from "react";
import { ProviderList } from "@/components/ProviderList";
import ProviderMap from "@/components/ProviderMap";
import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Provider } from "@/types/provider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { HealthcareProviderType } from "@/types/healthcare";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_COORDINATES = {
  latitude: -15.3875,
  longitude: 28.3228
};

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<HealthcareProviderType | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(50); // in kilometers
  const [useUserLocation, setUseUserLocation] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDINATES);
  const isMobile = useIsMobile();

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation && useUserLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success("Using your current location for distance calculations");
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get your location. Using default location.");
        }
      );
    }
  }, [useUserLocation]);

  // Calculate distance between two coordinates in kilometers (using Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers', searchTerm, selectedType, maxDistance, userLocation],
    queryFn: async () => {
      console.log('Fetching providers with type:', selectedType);
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

      // Process providers data and calculate distances
      const processedProviders = data.map((profile): Provider => {
        const providerLocation = {
          latitude: profile.provider_locations?.[0]?.latitude || DEFAULT_COORDINATES.latitude,
          longitude: profile.provider_locations?.[0]?.longitude || DEFAULT_COORDINATES.longitude
        };
        
        // Calculate distance from user location
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          providerLocation.latitude,
          providerLocation.longitude
        );

        return {
          id: profile.id,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          specialty: profile.specialty || 'General Practice',
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          provider_type: profile.provider_type,
          expertise: ['General Medicine', 'Primary Care'],
          location: providerLocation,
          rating: 4.5, // Hardcoded for now
          distance: parseFloat(distance.toFixed(1))
        };
      });

      // Filter by distance if maxDistance is set
      return processedProviders.filter(provider => 
        maxDistance === 50 || provider.distance <= maxDistance
      ).sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-24 space-y-6">
        <div className="flex flex-col space-y-4">
          <h1 className="text-2xl font-bold">Find Healthcare Providers</h1>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select 
              value={selectedType || "none"} 
              onValueChange={(value: string) => setSelectedType(value === "none" ? null : value as HealthcareProviderType)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Provider type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Types</SelectItem>
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

          <div className="p-4 bg-card rounded-md shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="distance-filter" className="text-sm font-medium">
                Distance: {maxDistance === 50 ? 'Any distance' : `${maxDistance} km or less`}
              </Label>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => setUseUserLocation(!useUserLocation)}
              >
                <MapPin className="h-4 w-4" />
                {useUserLocation ? 'Using your location' : 'Use my location'}
              </Button>
            </div>
            <Slider
              id="distance-filter"
              defaultValue={[50]}
              max={50}
              min={1}
              step={1}
              onValueChange={(values) => setMaxDistance(values[0])}
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-6">
            <ProviderMap userLocation={userLocation} providers={providers} maxDistance={maxDistance} />
            <ProviderList providers={providers} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <ProviderList providers={providers} />
            </div>
            <div className="sticky top-24">
              <ProviderMap userLocation={userLocation} providers={providers} maxDistance={maxDistance} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
