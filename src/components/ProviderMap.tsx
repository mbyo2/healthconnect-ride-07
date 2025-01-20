import { useRef, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";
import { Provider } from "@/types/provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingScreen } from "@/components/LoadingScreen";

// Fix Leaflet's default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

interface ProviderMapProps {
  providers: Provider[];
  onProviderSelect?: (provider: Provider) => void;
  isLoading?: boolean;
  error?: Error | null;
}

export const ProviderMap = ({ 
  providers, 
  onProviderSelect,
  isLoading,
  error 
}: ProviderMapProps) => {
  const mapRef = useRef<L.Map>(null);
  const defaultPosition: LatLngTuple = [37.7749, -122.4194]; // San Francisco coordinates

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>
          Error loading map: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full h-[500px] relative rounded-lg overflow-hidden shadow-md">
      <MapContainer
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        defaultCenter={defaultPosition}
        defaultZoom={13}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attributionControl={true}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {providers.map((provider) => {
          if (!provider.location?.latitude || !provider.location?.longitude) {
            console.warn(`Provider ${provider.id} has invalid location data`);
            return null;
          }

          const position: LatLngTuple = [
            provider.location.latitude,
            provider.location.longitude,
          ];

          return (
            <Marker
              key={provider.id}
              position={position}
              eventHandlers={{
                click: () => onProviderSelect?.(provider),
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">
                    Dr. {provider.first_name} {provider.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {provider.specialty}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};