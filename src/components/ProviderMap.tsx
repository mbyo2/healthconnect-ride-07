import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { useState } from 'react';
import { Button } from './ui/button';
import { BookingModal } from './BookingModal';

const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Provider {
  id: number;
  name: string;
  position: [number, number];
  specialty: string;
  rating: number;
  availability: string;
}

const mockProviderLocations: Provider[] = [
  { 
    id: 1, 
    name: "Dr. Sarah Johnson", 
    position: [40.7128, -74.0060], 
    specialty: "General Practitioner",
    rating: 4.9,
    availability: "Available Today"
  },
  { 
    id: 2, 
    name: "Dr. Michael Chen", 
    position: [40.7580, -73.9855], 
    specialty: "Pediatrician",
    rating: 4.8,
    availability: "Available Tomorrow"
  },
  { 
    id: 3, 
    name: "Dr. Emily Williams", 
    position: [40.7829, -73.9654], 
    specialty: "Family Medicine",
    rating: 4.7,
    availability: "Available Today"
  },
];

export const ProviderMap = () => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer 
        style={{ height: '100%', width: '100%' }}
        center={[40.7128, -74.0060] as [number, number]}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {mockProviderLocations.map((provider) => (
          <Marker
            key={provider.id}
            position={provider.position}
            icon={defaultIcon}
            eventHandlers={{
              click: () => setSelectedProvider(provider),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{provider.name}</h3>
                <p className="text-sm text-gray-600">{provider.specialty}</p>
                <p className="text-sm text-gray-600">{provider.availability}</p>
                <p className="text-sm text-gray-600">Rating: {provider.rating}</p>
                <Button
                  className="mt-2 w-full"
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  Book Appointment
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {selectedProvider && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedProvider(null);
          }}
          provider={{
            name: selectedProvider.name,
            specialty: selectedProvider.specialty
          }}
        />
      )}
    </div>
  );
};