import { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Provider } from '@/types/provider';
import 'leaflet/dist/leaflet.css';

interface ProviderMapProps {
  providers: Provider[];
}

export const ProviderMap = ({ providers }: ProviderMapProps) => {
  const mapRef = useRef(null);
  const defaultPosition: [number, number] = [51.505, -0.09]; // Default to London

  return (
    <MapContainer
      ref={mapRef}
      style={{ height: '400px', width: '100%' }}
      className="rounded-lg shadow-md"
      center={defaultPosition}
      zoom={13}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {providers.map((provider) => (
        <Marker key={provider.id} position={defaultPosition}>
          <Popup>
            <div>
              <h3>Dr. {provider.first_name} {provider.last_name}</h3>
              {provider.specialty && <p>{provider.specialty}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};