import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface AmbulancePosition {
  dispatch_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}

interface PublisherOptions {
  dispatchId: string | null;
  institutionId?: string | null;
  enabled?: boolean;
  intervalMs?: number;
}

/**
 * Ambulance crew GPS publisher.
 *
 * While enabled for a dispatch (crew uses it when the unit is en_route /
 * on_scene / transporting), the device position is written to
 * ambulance_positions every `intervalMs` (default 15s) so the dispatch
 * board can show where the unit actually is. Mirrors the courier GPS
 * pattern (useCourierLocation). Stops when disabled or unmounted.
 *
 * Table: 20261020_ambulance_positions.sql (RLS scoped like
 * ambulance_dispatches — dispatcher / crew lead / institution staff).
 */
export function useAmbulancePositionPublisher({
  dispatchId,
  institutionId = null,
  enabled = true,
  intervalMs = 15000,
}: PublisherOptions) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!dispatchId || !enabled || !user) {
      setSharing(false);
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported on this device");
      return;
    }

    const pushPosition = async (lat: number, lng: number, accuracy?: number) => {
      setLastPosition({ lat, lng });
      const { error: insertError } = await (supabase as any)
        .from("ambulance_positions")
        .insert({
          dispatch_id: dispatchId,
          institution_id: institutionId,
          lat,
          lng,
          accuracy_m: accuracy ?? null,
          recorded_by: user.id,
        });
      if (insertError) {
        console.error("Failed to publish ambulance position:", insertError);
        setError("Could not publish position — check connection and dispatch permissions");
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
              ? "Location permission denied — enable GPS to share the unit's position"
              : "Could not get GPS position"
          );
          setSharing(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };

    requestOnce();
    intervalRef.current = setInterval(requestOnce, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSharing(false);
    };
  }, [dispatchId, institutionId, enabled, intervalMs, user]);

  return { sharing, error, lastPosition };
}

/**
 * Latest known position per dispatch, for the dispatch board.
 * Polls every 20s and also listens to realtime inserts (the table is in
 * the supabase_realtime publication per the migration) so a moving unit
 * updates without a manual refresh.
 */
export function useLatestAmbulancePositions(dispatchIds: string[], pollMs = 20000) {
  const [positions, setPositions] = useState<Record<string, AmbulancePosition>>({});
  const idsKey = dispatchIds.slice().sort().join(",");

  useEffect(() => {
    if (!idsKey) {
      setPositions({});
      return;
    }
    const ids = idsKey.split(",");
    let cancelled = false;

    const fetchLatest = async () => {
      const { data, error } = await (supabase as any)
        .from("ambulance_positions")
        .select("dispatch_id, lat, lng, recorded_at")
        .in("dispatch_id", ids)
        .order("recorded_at", { ascending: false })
        .limit(300);
      if (cancelled || error || !data) return;
      const latest: Record<string, AmbulancePosition> = {};
      for (const row of data as AmbulancePosition[]) {
        if (!latest[row.dispatch_id]) latest[row.dispatch_id] = row;
      }
      setPositions(latest);
    };

    fetchLatest();
    const timer = setInterval(fetchLatest, pollMs);

    const channel = supabase
      .channel("ambulance_positions_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ambulance_positions" },
        (payload: any) => {
          const row = payload.new as AmbulancePosition;
          if (!ids.includes(row.dispatch_id)) return;
          setPositions((prev) => {
            const current = prev[row.dispatch_id];
            if (current && current.recorded_at >= row.recorded_at) return prev;
            return { ...prev, [row.dispatch_id]: row };
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [idsKey, pollMs]);

  return positions;
}

/** "Xs ago" / "Xm ago" label for a position timestamp. */
export function positionAgeLabel(recordedAt: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(recordedAt).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}
