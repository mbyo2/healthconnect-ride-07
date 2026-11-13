// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
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
      <circle cx="12" cy="12" r="10" fill="#0066f5" stroke="white" stroke-width="2"/>
      <path d="M8 16 L10 8 L14 8 L16 16 M9 12 L15 12" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="9" cy="17.5" r="1.6" fill="white"/>
      <circle cx="15" cy="17.5" r="1.6" fill="white"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
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
 * Supabase realtime on courier_locations) and the travelled path. This is
 * the Yango-style live tracking view. (Pickup/dropoff pins were removed
 * 2026-11-13: delivery_tracking has no lat/lng columns live.)
 */
export function LiveDeliveryMap({ deliveryId, height = 280 }: LiveDeliveryMapProps) {
  const [delivery, setDelivery] = useState<any>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("delivery_tracking")
        // Live columns only: delivery_tracking has no pickup/dropoff lat/lng
        // (dropped 2026-11-13 — the pins had no live source, so the whole
        // select 400'd). There is also no FK from delivery_tracking to
        // couriers (PGRST200 on the old embedded-courier select), so
        // the courier is fetched in a second query by user_id = driver_id.
        .select("id, status, driver_id")
        .eq("id", deliveryId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        let courier = null;
        if (data.driver_id) {
          const { data: c } = await (supabase as any)
            .from("couriers")
            .select("id, full_name, current_latitude, current_longitude, vehicle_type")
            .eq("user_id", data.driver_id)
            .maybeSingle();
          courier = c ?? null;
        }
        if (!cancelled) setDelivery({ ...data, courier });
      }

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
            d ? { ...d, courier: { ...d.courier, current_latitude: lat, current_longitude: lng } } : d
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
    delivery?.courier?.current_latitude != null
      ? [delivery.courier.current_latitude, delivery.courier.current_longitude]
      : trail.length > 0
        ? trail[trail.length - 1]
        : null;

  // No pickup/dropoff pins: delivery_tracking carries no lat/lng columns
  // live, so there is no honest coordinate source for either pin. The map
  // centres on the courier (live GPS) or the last trail point instead.
  const center: [number, number] = courierPos ?? [-15.3875, 28.3228]; // Lusaka fallback

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
        {trail.length > 1 && <Polyline positions={trail} color="#0066f5" weight={3} opacity={0.7} />}
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
