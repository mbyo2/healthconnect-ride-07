import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Provider } from '@/types/provider';
import { useRef, useEffect } from 'react';
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

// Custom component to handle map center updates
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  
  return null;
};

export const ProviderMap = ({ providers }: ProviderMapProps) => {
  const mapRef = useRef<L.Map>(null);
  const defaultCenter: [number, number] = [40.7128, -74.0060]; // New York coordinates

  return (
    <MapContainer
      ref={mapRef}
      className="h-full w-full rounded-lg shadow-lg animate-fade-in"
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <MapUpdater center={defaultCenter} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {providers.map((provider, index) => (
        <Marker 
          key={provider.id || index} 
          position={provider.location}
          icon={L.icon({
            iconUrl: '/marker-icon.png',
            iconRetinaUrl: '/marker-icon-2x.png',
            shadowUrl: '/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })}
        >
          <Popup className="provider-popup">
            <div className="p-2">
              <h3 className="font-bold text-lg">{provider.name}</h3>
              <p className="text-sm text-gray-600">{provider.specialty}</p>
              <p className="text-sm text-gray-600">{provider.availability}</p>
              <div className="mt-2">
                <span className="text-sm font-semibold">Rating: </span>
                <span className="text-sm text-yellow-500">★</span>
                <span className="text-sm">{provider.rating}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};