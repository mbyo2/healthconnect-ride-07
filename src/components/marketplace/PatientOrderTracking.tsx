import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock, Truck, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "pending", label: "Placed", icon: Clock },
  { id: "assigned", label: "Assigned", icon: Package },
  { id: "picked_up", label: "Picked up", icon: Package },
  { id: "in_transit", label: "In transit", icon: Truck },
  { id: "delivered", label: "Delivered", icon: CheckCircle },
];

/**
 * Patient-facing delivery progress for one marketplace order.
 * Reads the tracking row the server trigger opens at order placement —
 * an order with no row yet renders as "Placed".
 */
export const PatientOrderTracking = ({ orderId }: { orderId: string }) => {
  const { data: tracking } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_tracking")
        .select("status, pickup_time, delivery_time, tracking_notes, updated_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
    enabled: !!orderId,
  });

  const currentIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.id === (tracking?.status || "pending"))
  );

  return (
    <div className="mt-3 rounded-xl bg-white dark:bg-slate-950 border border-canvas-silk dark:border-slate-800 p-3">
      <ol className="flex items-center" aria-label="Delivery progress">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <li key={stage.id} className="flex flex-1 items-center last:flex-none" aria-current={current ? "step" : undefined}>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border",
                    done && "border-emerald-500 bg-emerald-500/10 text-emerald-600",
                    current && "border-primary bg-primary/10 text-primary",
                    !done && !current && "border-border text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className={cn("text-[9px] font-bold truncate", current ? "text-primary" : "text-muted-foreground")}>
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <span className={cn("mx-1 mb-4 h-px flex-1", i < currentIndex ? "bg-emerald-500" : "bg-border")} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
      {(tracking?.pickup_time || tracking?.delivery_time || tracking?.tracking_notes) && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {tracking.pickup_time && <>Picked up {format(new Date(tracking.pickup_time), "MMM d, h:mm a")}</>}
          {tracking.pickup_time && tracking.delivery_time && <> • </>}
          {tracking.delivery_time && <>Delivered {format(new Date(tracking.delivery_time), "MMM d, h:mm a")}</>}
          {tracking.tracking_notes && <> — {tracking.tracking_notes}</>}
        </p>
      )}
    </div>
  );
};
