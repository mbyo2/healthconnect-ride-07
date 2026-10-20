import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseCourierLocationOptions {
  courierId: string | null;
  deliveryId?: string | null;
  enabled?: boolean;
  intervalMs?: number;
}

/**
 * Courier GPS sharing hook.
 *
 * When a courier is on an active delivery, this shares their GPS position
 * with the platform every `intervalMs` (default 15s):
 * - Updates couriers.current_latitude/current_longitude (for dispatch +
 *   live map). NOTE: the live couriers table uses the *_latitude/_longitude
 *   names from 20261010_yango_delivery_couriers.sql — the older
 *   current_lat/lng names were verified NOT to exist live, so writes to
 *   them failed silently.
 * - Inserts into courier_locations (history/audit trail; columns lat/lng,
 *   recorded_at per 20261010_courier_delivery_system.sql, table created
 *   live by 20261020_delivery_order_creation.sql).
 *
 * deliveryId note: courier_locations.delivery_id references
 * delivery_tracking (the pharmacy board stack), NOT delivery_orders —
 * callers working with delivery_orders ids must leave deliveryId null or
 * the insert violates the FK.
 *
 * Uses the browser Geolocation API. Stops when disabled or unmounted.
 */
export function useCourierLocation({
  courierId,
  deliveryId = null,
  enabled = true,
  intervalMs = 15000,
}: UseCourierLocationOptions) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!courierId || !enabled) {
      setSharing(false);
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported on this device");
      return;
    }

    const pushPosition = async (lat: number, lng: number, accuracy?: number) => {
      setLastPosition({ lat, lng });
      try {
        // Update courier's current position (for dispatch + live map)
        await (supabase as any)
          .from("couriers")
          .update({
            current_latitude: lat,
            current_longitude: lng,
            last_location_update: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", courierId);

        // Append to location history
        await (supabase as any).from("courier_locations").insert({
          courier_id: courierId,
          delivery_id: deliveryId,
          lat,
          lng,
          accuracy_m: accuracy ?? null,
        });
      } catch (e) {
        console.error("Failed to push courier location:", e);
      }
    };

    const requestOnce = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setError(null);
          setSharing(true);
          pushPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        (err) => {
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied — enable GPS to share your position"
              : "Could not get GPS position"
          );
          setSharing(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };

    // Immediate first fix, then interval
    requestOnce();
    intervalRef.current = setInterval(requestOnce, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      setSharing(false);
    };
  }, [courierId, deliveryId, enabled, intervalMs]);

  return { sharing, error, lastPosition };
}
