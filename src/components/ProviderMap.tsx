import { useRef, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";
import { Provider } from "@/types/provider";

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
}

export const ProviderMap = ({ providers, onProviderSelect }: ProviderMapProps) => {
  const mapRef = useRef(null);
  const defaultPosition: LatLngTuple = [37.7749, -122.4194]; // San Francisco coordinates

  useEffect(() => {
    // Any map initialization logic can go here
  }, []);

  return (
    <div className="w-full h-[500px] relative">
      <MapContainer
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        center={defaultPosition}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {providers.map((provider) => {
          const position: LatLngTuple = [provider.location.latitude, provider.location.longitude];
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
                  <h3 className="font-semibold">Dr. {provider.first_name} {provider.last_name}</h3>
                  <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};