
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Map as LeafletMap } from 'leaflet';
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

// This component updates the map view when user location changes
function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    console.log('LocationMarker: Attempting to get user location');
    if (!map) return;

    const handleLocationFound = (e: any) => {
      console.log('LocationMarker: User location found', e.latlng);
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      map.setView(newPos, map.getZoom());
    };

    const locate = map.locate();
    locate.on("locationfound", handleLocationFound);

    return () => {
      locate.off("locationfound", handleLocationFound);
    };
  }, [map]);

  return position ? (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  ) : null;
}

export const ProviderMap = () => {
  const mapRef = useRef<LeafletMap>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>(DEFAULT_COORDINATES);
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
  });

  useEffect(() => {
    if (navigator.geolocation) {
      console.log('ProviderMap: Requesting user location');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('ProviderMap: User location received', position.coords);
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location. Using default location (Lusaka, Zambia).');
          setUserLocation(DEFAULT_COORDINATES);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  // Memoize the providers markers to prevent unnecessary re-renders
  const providerMarkers = useMemo(() => 
    providers.map((provider) => (
      <Marker 
        key={provider.id} 
        position={[provider.latitude, provider.longitude]}
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
    <div className="relative w-full h-[calc(100vh-10rem)] rounded-lg overflow-hidden">
      <MapContainer
        ref={mapRef}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        defaultCenter={userLocation}
        defaultZoom={DEFAULT_ZOOM}
        minZoom={3}
        maxZoom={18}
        zoomControl={!isMobile}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          minZoom={3}
        />
        <LocationMarker />
        {providerMarkers}
      </MapContainer>
    </div>
  );
};

