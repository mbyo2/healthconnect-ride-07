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
  const defaultPosition: L.LatLngExpression = [51.505, -0.09];

  return (
    <MapContainer
      className={`h-[400px] ${className}`}
      center={defaultPosition}
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
          position={[provider.latitude, provider.longitude]}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold">{provider.name}</h3>
              <p className="text-sm">{provider.specialty}</p>
              <p className="text-sm">{provider.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};