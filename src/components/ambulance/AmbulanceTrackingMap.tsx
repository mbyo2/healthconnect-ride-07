import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AmbulanceDispatch } from '@/hooks/useAmbulanceDispatch';
import { Badge } from '@/components/ui/badge';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom ambulance icon
const ambulanceIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="32" height="32">
      <rect x="2" y="6" width="18" height="12" rx="2" fill="#dc2626"/>
      <rect x="8" y="8" width="2" height="4" fill="white"/>
      <rect x="7" y="9" width="4" height="2" fill="white"/>
      <circle cx="6" cy="18" r="2" fill="#374151"/>
      <circle cx="16" cy="18" r="2" fill="#374151"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const pickupIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#16a34a" width="24" height="24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const destinationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="24" height="24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

interface MapUpdaterProps {
  center: [number, number];
  zoom: number;
}

const MapUpdater = ({ center, zoom }: MapUpdaterProps) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

interface AmbulanceTrackingMapProps {
  dispatches: AmbulanceDispatch[];
  selectedDispatchId?: string | null;
  onSelectDispatch?: (id: string) => void;
}

// Default center: Lusaka, Zambia
const DEFAULT_CENTER: [number, number] = [-15.4167, 28.2833];
const DEFAULT_ZOOM = 12;

export const AmbulanceTrackingMap: React.FC<AmbulanceTrackingMapProps> = ({
  dispatches,
  selectedDispatchId,
  onSelectDispatch,
}) => {
  const mapRef = useRef<L.Map>(null);

  // Filter dispatches with valid coordinates
  const dispatchesWithCoords = dispatches.filter(
    d => d.pickup_lat && d.pickup_lng
  );

  // Calculate center based on active dispatches
  const activeDispatches = dispatchesWithCoords.filter(
    d => !['completed', 'cancelled'].includes(d.status)
  );

  const center: [number, number] = activeDispatches.length > 0
    ? [activeDispatches[0].pickup_lat!, activeDispatches[0].pickup_lng!]
    : DEFAULT_CENTER;

  const selectedDispatch = selectedDispatchId
    ? dispatches.find(d => d.id === selectedDispatchId)
    : null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return '#dc2626';
      case 'urgent': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={selectedDispatch && selectedDispatch.pickup_lat ? [selectedDispatch.pickup_lat, selectedDispatch.pickup_lng!] : center} zoom={DEFAULT_ZOOM} />

        {dispatchesWithCoords.map(dispatch => {
          const isActive = !['completed', 'cancelled'].includes(dispatch.status);
          const isSelected = dispatch.id === selectedDispatchId;

          return (
            <React.Fragment key={dispatch.id}>
              {/* Pickup marker */}
              <Marker
                position={[dispatch.pickup_lat!, dispatch.pickup_lng!]}
                icon={isActive ? ambulanceIcon : pickupIcon}
                eventHandlers={{
                  click: () => onSelectDispatch?.(dispatch.id),
                }}
              >
                <Popup>
                  <div className="space-y-1 min-w-[200px]">
                    <p className="font-semibold">{dispatch.ambulance_unit}</p>
                    <p className="text-sm">Patient: {dispatch.patient_name}</p>
                    <p className="text-sm">Pickup: {dispatch.pickup_location}</p>
                    <p className="text-sm">Destination: {dispatch.destination}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        style={{ backgroundColor: getPriorityColor(dispatch.priority) + '20', color: getPriorityColor(dispatch.priority) }}
                      >
                        {dispatch.priority}
                      </Badge>
                      <Badge variant="outline">{getStatusLabel(dispatch.status)}</Badge>
                    </div>
                    {dispatch.estimated_eta_minutes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ETA: {dispatch.estimated_eta_minutes} min
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Destination marker if coordinates exist */}
              {dispatch.destination_lat && dispatch.destination_lng && (
                <>
                  <Marker
                    position={[dispatch.destination_lat, dispatch.destination_lng]}
                    icon={destinationIcon}
                  >
                    <Popup>
                      <p className="font-medium">Destination</p>
                      <p className="text-sm">{dispatch.destination}</p>
                    </Popup>
                  </Marker>

                  {/* Route line */}
                  {isActive && (
                    <Polyline
                      positions={[
                        [dispatch.pickup_lat!, dispatch.pickup_lng!],
                        [dispatch.destination_lat, dispatch.destination_lng],
                      ]}
                      pathOptions={{
                        color: getPriorityColor(dispatch.priority),
                        weight: isSelected ? 4 : 2,
                        dashArray: isActive ? undefined : '5, 10',
                        opacity: isSelected ? 1 : 0.6,
                      }}
                    />
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};
