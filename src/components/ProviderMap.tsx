import { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Provider } from '@/types/provider';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

interface ProviderMapProps {
  providers: Provider[];
  onMarkerClick: (provider: Provider) => void;
}

export const ProviderMap = ({ providers, onMarkerClick }: ProviderMapProps) => {
  const mapRef = useRef<L.Map>();
  const defaultPosition: [number, number] = [51.505, -0.09];

  return (
    <MapContainer
      ref={mapRef}
      style={{ height: '400px', width: '100%' }}
      className="rounded-lg border"
      center={defaultPosition}
      zoom={13}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {providers.map((provider) => (
        <Marker
          key={provider.id}
          position={provider.location || defaultPosition}
          eventHandlers={{
            click: () => onMarkerClick(provider),
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold">{provider.first_name} {provider.last_name}</h3>
              <p className="text-sm text-gray-600">{provider.specialty}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};