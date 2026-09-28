import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Truck, CheckCircle, Clock, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { markDelivered, isValidOrderTransition } from "@/utils/marketplace-workflows";
import { useAuth } from "@/context/AuthContext";

interface DeliveryTrackingProps {
  pharmacyId: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  assigned: { icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Assigned" },
  pending: { icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "Pending" },
  picked_up: { icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Picked Up" },
  in_transit: { icon: Truck, color: "text-purple-600 bg-purple-50 border-purple-200", label: "In Transit" },
  delivered: { icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200", label: "Delivered" },
};

const NEXT_STATUS: Record<string, { next: string; label: string } | null> = {
  pending: { next: "assigned", label: "Assign courier" },
  assigned: { next: "picked_up", label: "Mark picked up" },
  picked_up: { next: "in_transit", label: "Mark in transit" },
  in_transit: { next: "delivered", label: "Mark delivered" },
  delivered: null,
};

export const PharmacyDeliveryTracking = ({ pharmacyId }: DeliveryTrackingProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["pharmacy-deliveries", pharmacyId],
    queryFn: async () => {
      // delivery_tracking has no pharmacy column — scope through orders!inner
      // so a pharmacy only ever sees its own deliveries.
      const { data, error } = await (supabase as any)
        .from("delivery_tracking")
        .select("*, order:orders!inner(id, total_amount, patient_id, pharmacy_id, status)")
        .eq("order.pharmacy_id", pharmacyId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!pharmacyId,
  });

  const handleAdvance = async (delivery: any) => {
    const step = NEXT_STATUS[delivery.status];
    if (!step || !user) return;
    setAdvancingId(delivery.id);
    try {
      const patch: any = { status: step.next, updated_at: new Date().toISOString() };
      if (step.next === "picked_up") patch.pickup_time = new Date().toISOString();
      if (step.next === "delivered") patch.delivery_time = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("delivery_tracking")
        .update(patch)
        .eq("id", delivery.id);
      if (error) throw error;

      // Keep the marketplace order in step: ready -> delivered follows the
      // validated state machine (never forced past cancelled/pending).
      if (step.next === "delivered" && delivery.order?.status) {
        if (isValidOrderTransition(delivery.order.status, "delivered")) {
          await markDelivered(delivery.order.id, user.id);
        }
      }

      // Tell the patient (in-app + push). Best-effort: the status stands
      // even if the notification fails.
      if (delivery.order?.patient_id && (step.next === "picked_up" || step.next === "delivered")) {
        try {
          await supabase.functions.invoke("send-push", {
            body: {
              userIds: [delivery.order.patient_id],
              title: step.next === "delivered" ? "Order delivered" : "Courier picked up your order",
              body: step.next === "delivered"
                ? `Order #${String(delivery.order_id).slice(0, 8)} was delivered.`
                : `Order #${String(delivery.order_id).slice(0, 8)} is on its way.`,
              url: "/orders",
              tag: "delivery",
            },
          });
        } catch (notifErr) {
          console.error("Delivery notification failed (non-fatal):", notifErr);
        }
      }

      toast.success(`Delivery ${step.next.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["pharmacy-deliveries", pharmacyId] });
    } catch (e: any) {
      console.error("Advance delivery failed:", e);
      toast.error(e?.message || "Could not update delivery status.");
    } finally {
      setAdvancingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Delivery Tracking</CardTitle>
        <CardDescription>Track medication and order deliveries</CardDescription>
      </CardHeader>
      <CardContent>
        {!deliveries?.length ? (
          <p className="text-center text-muted-foreground py-8">No deliveries to track yet</p>
        ) : (
          <div className="space-y-3">
            {deliveries.map((d: any) => {
              const config = statusConfig[d.status] || statusConfig.pending;
              const Icon = config.icon;
              return (
                <div key={d.id} className={`p-4 rounded-lg border ${config.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">Order #{d.order_id?.slice(0, 8)}</p>
                        <p className="text-xs opacity-70">
                          {d.pickup_time ? `Picked up: ${format(new Date(d.pickup_time), 'MMM d, h:mm a')}` : 'Awaiting pickup'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{config.label}</Badge>
                  </div>
                  {d.tracking_notes && (
                    <p className="text-xs mt-2 opacity-80 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {d.tracking_notes}
                    </p>
                  )}
                  {NEXT_STATUS[d.status] && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={advancingId === d.id}
                        onClick={() => handleAdvance(d)}
                        className="text-xs font-bold"
                      >
                        {advancingId === d.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5" />
                        )}
                        {NEXT_STATUS[d.status]?.label}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
