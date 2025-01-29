import { useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  location: LatLngTuple;
  rating?: number;
}

interface ProviderMapProps {
  providers: Provider[];
}

export const ProviderMap = ({ providers }: ProviderMapProps) => {
  const mapRef = useRef<LeafletMap>(null);
  const defaultPosition: LatLngTuple = [37.7749, -122.4194]; // San Francisco

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        center={defaultPosition}
        zoom={13}
        scrollWheelZoom={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {providers.map((provider) => (
          <Marker key={provider.id} position={provider.location}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{provider.first_name} {provider.last_name}</h3>
                <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                {provider.rating && (
                  <div className="flex items-center mt-1">
                    <span className="text-sm">Rating: {provider.rating}/5</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};