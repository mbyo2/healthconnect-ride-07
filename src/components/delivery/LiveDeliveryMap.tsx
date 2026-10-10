import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const courierIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <circle cx="12" cy="12" r="10" fill="#2563eb" stroke="white" stroke-width="2"/>
      <path d="M8 16 L10 8 L14 8 L16 16 M9 12 L15 12" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="9" cy="17.5" r="1.6" fill="white"/>
      <circle cx="15" cy="17.5" r="1.6" fill="white"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

const pickupIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#16a34a" width="28" height="28">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const dropoffIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" width="28" height="28">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function MapFollower({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true });
  }, [position, map]);
  return null;
}

interface LiveDeliveryMapProps {
  deliveryId: string;
  height?: number;
}

/**
 * Patient-facing LIVE delivery map.
 *
 * Shows the courier's real-time GPS position (refreshed every 10s via
 * Supabase realtime on courier_locations), plus pickup and dropoff pins
 * and the travelled path. This is the Yango-style live tracking view.
 */
export function LiveDeliveryMap({ deliveryId, height = 280 }: LiveDeliveryMapProps) {
  const [delivery, setDelivery] = useState<any>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("delivery_tracking")
        .select(
          "id, status, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, courier:couriers(id, full_name, current_lat, current_lng, vehicle_type)"
        )
        .eq("id", deliveryId)
        .maybeSingle();
      if (!cancelled && data) setDelivery(data);

      const { data: locs } = await (supabase as any)
        .from("courier_locations")
        .select("lat, lng")
        .eq("delivery_id", deliveryId)
        .order("recorded_at", { ascending: true })
        .limit(200);
      if (!cancelled && locs) setTrail(locs.map((l: any) => [l.lat, l.lng] as [number, number]));
    };
    load();

    // Realtime: new courier positions arrive live
    const channel = supabase
      .channel(`delivery-${deliveryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "courier_locations",
          filter: `delivery_id=eq.${deliveryId}`,
        },
        (payload: any) => {
          const { lat, lng } = payload.new;
          setTrail((t) => [...t.slice(-199), [lat, lng]]);
          setDelivery((d: any) =>
            d ? { ...d, courier: { ...d.courier, current_lat: lat, current_lng: lng } } : d
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_tracking",
          filter: `id=eq.${deliveryId}`,
        },
        (payload: any) => {
          setDelivery((d: any) => (d ? { ...d, status: payload.new.status } : d));
        }
      )
      .subscribe();

    // Fallback poll every 10s in case realtime drops
    const poll = setInterval(load, 10000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [deliveryId]);

  const courierPos: [number, number] | null =
    delivery?.courier?.current_lat != null
      ? [delivery.courier.current_lat, delivery.courier.current_lng]
      : trail.length > 0
        ? trail[trail.length - 1]
        : null;

  const pickup: [number, number] | null =
    delivery?.pickup_lat != null ? [delivery.pickup_lat, delivery.pickup_lng] : null;
  const dropoff: [number, number] | null =
    delivery?.dropoff_lat != null ? [delivery.dropoff_lat, delivery.dropoff_lng] : null;

  const center: [number, number] = courierPos ?? pickup ?? dropoff ?? [-15.3875, 28.3228]; // Lusaka fallback

  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFollower position={courierPos} />
        {trail.length > 1 && <Polyline positions={trail} color="#2563eb" weight={3} opacity={0.7} />}
        {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup>Pickup — pharmacy</Popup>
          </Marker>
        )}
        {dropoff && (
          <Marker position={dropoff} icon={dropoffIcon}>
            <Popup>Delivery address</Popup>
          </Marker>
        )}
        {courierPos && (
          <Marker position={courierPos} icon={courierIcon}>
            <Popup>
              {delivery?.courier?.full_name || "Courier"}
              {delivery?.courier?.vehicle_type && ` (${delivery.courier.vehicle_type})`}
              <br />
              <span className="text-xs text-muted-foreground capitalize">
                Status: {delivery?.status?.replace(/_/g, " ")}
              </span>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
