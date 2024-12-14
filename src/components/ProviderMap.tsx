import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Provider } from "@/types/provider";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface ProviderMapProps {
  providers: Provider[];
  onProviderSelect?: (provider: Provider) => void;
}

export const ProviderMap = ({ providers, onProviderSelect }: ProviderMapProps) => {
  const defaultCenter: [number, number] = providers.length > 0
    ? providers.reduce(
        (acc, provider) => [
          acc[0] + provider.location[0] / providers.length,
          acc[1] + provider.location[1] / providers.length,
        ],
        [0, 0]
      )
    : [40.7128, -74.0060]; // Default to NYC coordinates

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {providers.map((provider) => (
          <Marker
            key={provider.id}
            position={provider.location}
            eventHandlers={{
              click: () => onProviderSelect?.(provider),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{provider.name}</h3>
                <p className="text-sm">{provider.specialty}</p>
                <p className="text-sm">Rating: {provider.rating}/5</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};