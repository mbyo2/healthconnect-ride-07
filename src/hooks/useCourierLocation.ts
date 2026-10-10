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
 * - Updates couriers.current_lat/lng (for dispatch + live map)
 * - Inserts into courier_locations (history/audit trail)
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
            current_lat: lat,
            current_lng: lng,
            location_updated_at: new Date().toISOString(),
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
