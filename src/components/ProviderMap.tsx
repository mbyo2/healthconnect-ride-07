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
  id?: number;
  name: string;
  specialty: string;
  rating: number;
  availability: string;
  position?: [number, number];
  location: string;
  expertise: string[];
}

interface ProviderMapProps {
  providers: Provider[];
}

const mockLocations: Record<string, [number, number]> = {
  "Manhattan, NY": [40.7128, -74.0060],
  "Brooklyn, NY": [40.7580, -73.9855],
  "Queens, NY": [40.7829, -73.9654],
};

export const ProviderMap = ({ providers }: ProviderMapProps) => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const providersWithLocations = providers.map((provider, index) => ({
    ...provider,
    id: index + 1,
    position: mockLocations[provider.location] || [40.7128, -74.0060],
  }));

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer 
        defaultCenter={[40.7128, -74.0060]}
        defaultZoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attributionUrl='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {providersWithLocations.map((provider) => (
          <Marker
            key={provider.id}
            position={provider.position}
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