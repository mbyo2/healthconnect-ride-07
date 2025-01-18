import { useRef, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

// This component handles map initialization
const MapInitializer = ({ center }: { center: LatLngTuple }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  
  return null;
};

export const ProviderMap = ({ providers, onProviderSelect }: ProviderMapProps) => {
  const mapRef = useRef<L.Map>(null);
  const defaultPosition: LatLngTuple = [37.7749, -122.4194]; // San Francisco coordinates

  return (
    <div className="w-full h-[500px] relative">
      <MapContainer
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        scrollWheelZoom={false}
        viewport={{
          center: defaultPosition,
          zoom: 13,
        }}
      >
        <MapInitializer center={defaultPosition} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attributionControl={true}
        >
          <div className="leaflet-attribution">
            &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
          </div>
        </TileLayer>
        {providers.map((provider) => {
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