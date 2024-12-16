import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Provider } from "@/types/provider";

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
  // Default to NYC coordinates if no providers
  const defaultPosition: [number, number] = [40.7128, -74.0060];
  
  // Use the first provider's location as center if available
  const center = providers.length > 0 ? providers[0].location : defaultPosition;

  return (
    <MapContainer
      className={`h-[400px] ${className}`}
      center={center}
      zoom={13}
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
  );
};