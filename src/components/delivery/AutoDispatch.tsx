import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, UserCheck } from "lucide-react";

interface AutoDispatchProps {
  deliveryId: string;
  pickupLat: number | null;
  pickupLng: number | null;
  institutionId?: string | null;
  onDispatched?: () => void;
}

/**
 * Automated courier dispatch.
 *
 * "Dispatch nearest" calls dispatch_nearest_courier (Haversine) then
 * assign_courier_to_delivery (atomic claim — prevents double-dispatch).
 * Manual assignment lists available couriers as fallback.
 */
export function AutoDispatch({
  deliveryId,
  pickupLat,
  pickupLng,
  institutionId,
  onDispatched,
}: AutoDispatchProps) {
  const queryClient = useQueryClient();
  const [dispatching, setDispatching] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const { data: couriers } = useQuery({
    queryKey: ["available-couriers", institutionId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("couriers")
        .select("id, full_name, vehicle_type, rating, total_deliveries")
        .eq("is_active", true)
        .eq("is_available", true)
        .order("rating", { ascending: false })
        .limit(20);
      if (institutionId) q = q.or(`institution_id.eq.${institutionId},institution_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const handleAutoDispatch = async () => {
    if (pickupLat == null || pickupLng == null) {
      toast.error("Pickup location not set — cannot auto-dispatch");
      return;
    }
    setDispatching(true);
    try {
      // 1. Find nearest available courier
      const { data: courierId, error: findErr } = await (supabase as any).rpc(
        "dispatch_nearest_courier",
        {
          p_pickup_lat: pickupLat,
          p_pickup_lng: pickupLng,
          p_institution_id: institutionId ?? null,
        }
      );
      if (findErr) throw findErr;
      if (!courierId) {
        toast.error("No available couriers right now");
        return;
      }
      // 2. Atomically claim + assign
      const { error: assignErr } = await (supabase as any).rpc("assign_courier_to_delivery", {
        p_delivery_id: deliveryId,
        p_courier_id: courierId,
      });
      if (assignErr) throw assignErr;

      toast.success("Courier dispatched — nearest available rider assigned");
      queryClient.invalidateQueries({ queryKey: ["pharmacy-deliveries"] });
      onDispatched?.();
    } catch (e: any) {
      toast.error(e?.message || "Dispatch failed");
    } finally {
      setDispatching(false);
    }
  };

  const handleManualAssign = async (courierId: string) => {
    setAssigningId(courierId);
    try {
      const { error } = await (supabase as any).rpc("assign_courier_to_delivery", {
        p_delivery_id: deliveryId,
        p_courier_id: courierId,
      });
      if (error) throw error;
      toast.success("Courier assigned");
      queryClient.invalidateQueries({ queryKey: ["pharmacy-deliveries"] });
      onDispatched?.();
    } catch (e: any) {
      toast.error(e?.message || "Assignment failed");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAutoDispatch}
        disabled={dispatching || pickupLat == null}
        className="w-full font-bold"
      >
        {dispatching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
        {dispatching ? "Dispatching…" : "Auto-dispatch nearest courier"}
      </Button>

      {couriers && couriers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-muted-foreground">Or assign manually:</p>
          {couriers.map((c: any) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-2 rounded-xl border border-border text-sm"
            >
              <div>
                <p className="font-semibold">{c.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {c.vehicle_type?.replace(/_/g, " ")} • ⭐ {Number(c.rating).toFixed(1)} •{" "}
                  {c.total_deliveries} deliveries
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={assigningId === c.id}
                onClick={() => handleManualAssign(c.id)}
              >
                {assigningId === c.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
