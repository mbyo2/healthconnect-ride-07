import { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Provider } from '@/types/provider';
import 'leaflet/dist/leaflet.css';

interface ProviderMapProps {
  providers: Provider[];
}

export const ProviderMap = ({ providers }: ProviderMapProps) => {
  const mapRef = useRef(null);
  const defaultCenter: [number, number] = [40.7128, -74.0060]; // NYC coordinates

  return (
    <MapContainer
      ref={mapRef}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg border"
      defaultCenter={defaultCenter}
      defaultZoom={13}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attributionUrl='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {providers.map((provider) => (
        provider.location && (
          <Marker key={provider.id} position={provider.location}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{provider.first_name} {provider.last_name}</h3>
                <p className="text-sm text-gray-600">{provider.specialty}</p>
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};