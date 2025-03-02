
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Provider } from '@/types/provider';

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

// Component to update map view
const MapUpdater = ({ center, map }: { center: [number, number], map: LeafletMap | null }) => {
  const leafletMap = useMap();
  
  useEffect(() => {
    if (map) {
      map.setView(center, DEFAULT_ZOOM);
    }
  }, [center, map]);
  
  return null;
};

interface ProviderMapProps {
  providers?: Provider[];
  userLocation?: { latitude: number; longitude: number };
  maxDistance?: number;
}

export const ProviderMap: React.FC<ProviderMapProps> = ({ 
  providers = [], 
  userLocation = { latitude: DEFAULT_COORDINATES[0], longitude: DEFAULT_COORDINATES[1] },
  maxDistance = 50
}) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [center, setCenter] = useState<[number, number]>(
    [userLocation.latitude, userLocation.longitude]
  );
  const navigate = useNavigate();

  // Update center when userLocation changes
  useEffect(() => {
    setCenter([userLocation.latitude, userLocation.longitude]);
  }, [userLocation]);

  // Function to handle geolocation
  const getUserLocation = () => {
    if (!mapRef.current || !navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCenter([latitude, longitude]);
        toast.success('Location found!');
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Function to handle profile view
  const handleViewProfile = (providerId: string) => {
    navigate(`/provider/${providerId}`);
  };

  // Memoize the providers markers to prevent unnecessary re-renders
  const providerMarkers = useMemo(() => 
    providers.map((provider) => {
      if (!provider.location) return null;
      return (
        <Marker 
          key={provider.id} 
          position={[provider.location.latitude, provider.location.longitude]}
          // @ts-ignore - icon property is supported but type definitions might be incorrect
          icon={customIcon}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-foreground">
                Dr. {provider.first_name} {provider.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{provider.specialty}</p>
              {provider.distance !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  Distance: {provider.distance} km
                </p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={() => handleViewProfile(provider.id)}
              >
                View Profile
              </Button>
            </div>
          </Popup>
        </Marker>
      );
    }),
    [providers, navigate]
  );

  // Create circle to show distance radius
  const distanceCircle = useMemo(() => 
    maxDistance && maxDistance < 50 ? (
      <Circle 
        center={center}
        pathOptions={{ 
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          color: '#3b82f6',
          weight: 1
        }}
        // @ts-ignore - radius property is supported but type definitions might be incorrect
        radius={maxDistance * 1000} // Convert km to meters
      />
    ) : null,
    [center, maxDistance]
  );

  return (
    <div className="relative w-full h-full min-h-[500px] lg:h-[calc(100vh-12rem)] rounded-lg overflow-hidden border">
      <Button
        variant="secondary"
        className="absolute top-4 right-4 z-[1000]"
        onClick={getUserLocation}
      >
        Find My Location
      </Button>
      <MapContainer
        // @ts-ignore - These props are supported but type definitions might be incorrect
        center={center}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        minZoom={3}
        maxZoom={18}
        zoomControl={true}
        scrollWheelZoom={true}
        whenReady={(map) => {
          mapRef.current = map.target;
        }}
      >
        <TileLayer
          // @ts-ignore - These props are supported but type definitions might be incorrect
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapUpdater center={center} map={mapRef.current} />
        {distanceCircle}
        {providerMarkers}
      </MapContainer>
    </div>
  );
};

export default ProviderMap;
