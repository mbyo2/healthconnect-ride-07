
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { LoadingScreen } from '@/components/LoadingScreen';

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  latitude: number;
  longitude: number;
}

// Default coordinates for Lusaka, Zambia
const DEFAULT_COORDINATES: [number, number] = [-15.3875, 28.3228];
const DEFAULT_ZOOM = 13;

// Create a custom icon for markers
const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ProviderMap = () => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [center] = useState<[number, number]>(DEFAULT_COORDINATES);
  const isMobile = useIsMobile();

  // Use React Query for caching and better data fetching
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      console.log('ProviderMap: Fetching providers');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          specialty,
          provider_type,
          provider_locations (
            latitude,
            longitude
          )
        `)
        .eq('role', 'health_personnel');

      if (error) throw error;

      return (data?.map(item => ({
        id: item.id,
        first_name: item.first_name || '',
        last_name: item.last_name || '',
        specialty: item.specialty || '',
        latitude: item.provider_locations?.[0]?.latitude || DEFAULT_COORDINATES[0],
        longitude: item.provider_locations?.[0]?.longitude || DEFAULT_COORDINATES[1]
      })) || []) as Provider[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Function to handle geolocation
  const getUserLocation = () => {
    if (!mapRef.current || !navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapRef.current?.setView([latitude, longitude], DEFAULT_ZOOM);
        toast.success('Location found!');
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Memoize the providers markers to prevent unnecessary re-renders
  const providerMarkers = useMemo(() => 
    providers.map((provider) => (
      <Marker 
        key={provider.id} 
        position={[provider.latitude, provider.longitude]}
        icon={customIcon}
      >
        <Popup>
          <div className="p-2">
            <h3 className="font-semibold text-foreground">
              Dr. {provider.first_name} {provider.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">{provider.specialty}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full"
              onClick={() => {
                console.log('Clicked provider:', provider.id);
              }}
            >
              View Profile
            </Button>
          </div>
        </Popup>
      </Marker>
    )),
    [providers]
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative w-full h-[calc(100vh-10rem)] rounded-lg overflow-hidden border">
      <Button
        variant="secondary"
        className="absolute top-4 right-4 z-[1000]"
        onClick={getUserLocation}
      >
        Find My Location
      </Button>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        minZoom={3}
        maxZoom={18}
        zoomControl={!isMobile}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />
        {providerMarkers}
      </MapContainer>
    </div>
  );
};

export default ProviderMap;
