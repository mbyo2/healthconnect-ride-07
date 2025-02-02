import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  latitude: number;
  longitude: number;
}

export const ProviderMap = () => {
  const mapRef = useRef<LeafletMap>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_locations')
        .select(`
          provider_id,
          latitude,
          longitude,
          profiles:provider_id (
            first_name,
            last_name,
            specialty
          )
        `);

      if (error) throw error;

      const formattedProviders = data?.map(item => ({
        id: item.provider_id,
        first_name: item.profiles.first_name,
        last_name: item.profiles.last_name,
        specialty: item.profiles.specialty,
        latitude: item.latitude,
        longitude: item.longitude
      })) || [];

      setProviders(formattedProviders);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers on map');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading map...</div>;
  }

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        defaultCenter={[0, 0]}
        defaultZoom={2}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {providers.map((provider) => (
          <Marker 
            key={provider.id} 
            position={[provider.latitude, provider.longitude]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">
                  Dr. {provider.first_name} {provider.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={() => {
                    // Navigate to provider profile or booking
                    console.log('Clicked provider:', provider.id);
                  }}
                >
                  View Profile
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};