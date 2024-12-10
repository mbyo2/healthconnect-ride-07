import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { useState } from 'react';

// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const mockProviderLocations = [
  { id: 1, name: "Dr. Sarah Johnson", position: [40.7128, -74.0060], specialty: "General Practitioner" },
  { id: 2, name: "Dr. Michael Chen", position: [40.7580, -73.9855], specialty: "Pediatrician" },
  { id: 3, name: "Dr. Emily Williams", position: [40.7829, -73.9654], specialty: "Family Medicine" },
];

export const ProviderMap = () => {
  const [selectedProvider, setSelectedProvider] = useState(null);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {mockProviderLocations.map((provider) => (
          <Marker
            key={provider.id}
            position={provider.position as [number, number]}
            icon={defaultIcon}
            eventHandlers={{
              click: () => setSelectedProvider(provider),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{provider.name}</h3>
                <p className="text-sm text-gray-600">{provider.specialty}</p>
                <button
                  className="mt-2 text-sm text-primary hover:text-primary/80"
                  onClick={() => console.log('Book appointment with', provider.name)}
                >
                  Book Appointment
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};