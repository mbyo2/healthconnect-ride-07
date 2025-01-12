import { useRef, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";

// Fix Leaflet's default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

interface Provider {
  id: string;
  name: string;
  specialty: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

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
          attributionUrl='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {providers.map((provider) => (
          <Marker
            key={provider.id}
            position={[provider.location.latitude, provider.location.longitude]}
            eventHandlers={{
              click: () => onProviderSelect?.(provider),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{provider.name}</h3>
                <p className="text-sm text-muted-foreground">{provider.specialty}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};