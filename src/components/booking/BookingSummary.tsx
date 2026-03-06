import { format } from "date-fns";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Provider } from "@/types/provider";
import { Button } from "@/components/ui/button";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue with leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface BookingSummaryProps {
  provider: Provider;
  selectedDate?: Date;
  selectedTime?: string;
  appointmentType?: string;
  providerAddress?: string;
}

export const BookingSummary = ({ 
  provider, 
  selectedDate, 
  selectedTime,
  appointmentType = 'physical',
  providerAddress
}: BookingSummaryProps) => {
  const [coords, setCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (appointmentType !== 'physical' || !providerAddress) return;
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(providerAddress)}&limit=1`
        );
        const data = await res.json();
        if (data?.[0]) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch {
        // Silently fail
      }
    };
    geocode();
  }, [providerAddress, appointmentType]);

  if (!selectedDate || !selectedTime) return null;

  const googleMapsUrl = providerAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(providerAddress)}`
    : null;

  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <h3 className="font-medium text-foreground">Booking Summary</h3>
      <div className="text-sm space-y-1 text-foreground">
        <p>Provider: Dr. {provider.first_name} {provider.last_name}</p>
        <p>Date: {format(selectedDate, "MMMM d, yyyy")}</p>
        <p>Time: {selectedTime}</p>
        <p>Duration: 30 minutes</p>
        <p>Type: {appointmentType === 'physical' ? '🏥 In-Person Visit' : '💻 Online Consultation'}</p>
        
        {appointmentType === 'physical' && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Appointment Location</p>
                {providerAddress ? (
                  <p className="text-muted-foreground text-xs">{providerAddress}</p>
                ) : (
                  <p className="text-muted-foreground text-xs">Location will be provided</p>
                )}
              </div>
            </div>

            {coords && (
              <div className="rounded-lg overflow-hidden border border-border" style={{ height: 200 }}>
                <MapContainer
                  center={coords}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={coords}>
                    <Popup>
                      <div className="text-xs">
                        <p className="font-medium">Dr. {provider.first_name} {provider.last_name}</p>
                        <p>{providerAddress}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}

            {googleMapsUrl && (
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-3.5 w-3.5" />
                  Get Directions
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
