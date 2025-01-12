import { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Provider } from '@/types/provider';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProviderMapProps {
  providers: Provider[];
  onMarkerClick?: (provider: Provider) => void;
}

export const ProviderMap = ({ providers, onMarkerClick }: ProviderMapProps) => {
  const mapRef = useRef(null);
  const defaultPosition: L.LatLngTuple = [51.505, -0.09]; // Default to London

  // Calculate center based on providers with locations
  const providersWithLocation = providers.filter(
    (provider): provider is Provider & { latitude: number; longitude: number } => 
      typeof provider.latitude === 'number' && 
      typeof provider.longitude === 'number'
  );

  const center: L.LatLngTuple = providersWithLocation.length > 0
    ? [
        providersWithLocation.reduce((sum, p) => sum + p.latitude, 0) / providersWithLocation.length,
        providersWithLocation.reduce((sum, p) => sum + p.longitude, 0) / providersWithLocation.length,
      ]
    : defaultPosition;

  return (
    <div className="w-full h-[400px]">
      <MapContainer
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg shadow-md"
        defaultCenter={center}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {providersWithLocation.map((provider) => (
          <Marker 
            key={provider.id} 
            position={[provider.latitude, provider.longitude] as L.LatLngTuple}
            eventHandlers={{
              click: () => onMarkerClick?.(provider)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">
                  Dr. {provider.first_name} {provider.last_name}
                </h3>
                {provider.specialty && (
                  <p className="text-sm text-gray-600">{provider.specialty}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};