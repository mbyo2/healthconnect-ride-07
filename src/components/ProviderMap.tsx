import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// This component updates the map view when user location changes
function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

export const ProviderMap = () => {
  const mapRef = useRef<LeafletMap>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location. Using default location.');
          setUserLocation([51.505, -0.09]); // Default to London if geolocation fails
        }
      );
    }

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
    return <div className="text-foreground">Loading map...</div>;
  }

  return (
    <div className="h-[calc(100vh-8rem)] w-full rounded-lg overflow-hidden border bg-background">
      <MapContainer
        ref={mapRef}
        center={userLocation as [number, number]}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
        {providers.map((provider) => (
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
        ))}
      </MapContainer>
    </div>
  );
};