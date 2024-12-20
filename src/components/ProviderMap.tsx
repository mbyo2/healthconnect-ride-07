import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Provider } from "@/types/provider";
import { useState } from "react";
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

export const ProviderMap = ({ providers = [], className = "" }: ProviderMapProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  
  // Default to NYC coordinates if no providers
  const defaultPosition: L.LatLngExpression = [40.7128, -74.0060];

  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (data && data[0]) {
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

      <div style={{ height: "400px", width: "100%" }} className={className}>
        <MapContainer
          defaultCenter={defaultPosition}
          defaultZoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {providers.map((provider, index) => (
            <Marker
              key={index}
              position={provider.location as L.LatLngExpression}
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
    </div>
  );
};