import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Provider } from '@/types/provider';
import { useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

interface ProviderMapProps {
  providers: Provider[];
}

export const ProviderMap = ({ providers }: ProviderMapProps) => {
  const mapRef = useRef<L.Map>(null);
  const defaultPosition: [number, number] = [40.7128, -74.0060]; // New York coordinates

  return (
    <MapContainer
      ref={mapRef}
      center={defaultPosition}
      zoom={13}
      className="h-full w-full rounded-lg shadow-lg animate-fade-in"
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {providers.map((provider, index) => (
        provider.location && (
          <Marker 
            key={provider.id || index} 
            position={provider.location}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg">{provider.first_name} {provider.last_name}</h3>
                <p className="text-sm text-gray-600">{provider.specialty}</p>
                <p className="text-sm text-gray-600">{provider.availability}</p>
                {provider.rating && (
                  <div className="mt-2">
                    <span className="text-sm font-semibold">Rating: </span>
                    <span className="text-sm text-yellow-500">★</span>
                    <span className="text-sm">{provider.rating}</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};