import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Provider } from "@/types/provider";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Compass } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

interface ProviderMapProps {
  providers?: Provider[];
  className?: string;
}

// Component to handle map center updates
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

export const ProviderMap = ({ providers = [], className = "" }: ProviderMapProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  
  // Default to NYC coordinates if no providers
  const defaultPosition: [number, number] = [40.7128, -74.0060];
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    providers.length > 0 ? providers[0].location : defaultPosition
  );

  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (data && data[0]) {
        const { lat, lon } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        toast({
          title: "Location found",
          description: `Showing results near ${data[0].display_name}`,
        });
      } else {
        toast({
          title: "Location not found",
          description: "Please try a different search term",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search location",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        toast({
          title: "Location found",
          description: "Showing results near your current location",
        });
        setIsLoading(false);
      },
      (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to get your location",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
        <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
          <Input
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
            className="w-full"
          />
        </div>
        <div className={`${isMobile ? 'grid grid-cols-2' : 'flex'} gap-2`}>
          <Button 
            onClick={handleLocationSearch}
            disabled={isLoading}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button 
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
            className="w-full"
          >
            <Compass className="h-4 w-4 mr-2" />
            Use My Location
          </Button>
        </div>
      </div>

      <MapContainer
        className={`h-[400px] ${className}`}
        style={{ height: "100%", width: "100%" }}
        zoom={13}
        scrollWheelZoom={false}
        key={`${mapCenter[0]}-${mapCenter[1]}`}
        defaultCenter={mapCenter}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attributionUrl='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapUpdater center={mapCenter} />
        {providers.map((provider, index) => (
          <Marker
            key={index}
            position={provider.location}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{provider.name}</h3>
                <p className="text-sm">{provider.specialty}</p>
                <p className="text-sm">Rating: {provider.rating}</p>
                {provider.availability && (
                  <p className="text-sm text-green-600">{provider.availability}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};