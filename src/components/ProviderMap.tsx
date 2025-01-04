import { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

export const ProviderMap = ({ providers, onMarkerClick }) => {
  const mapRef = useRef();
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
          position={[provider.latitude || defaultPosition[0], provider.longitude || defaultPosition[1]]}
          eventHandlers={{
            click: () => onMarkerClick(provider),
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold">{provider.name}</h3>
              <p className="text-sm text-gray-600">{provider.specialty}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};