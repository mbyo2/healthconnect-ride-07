import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

interface DeliveryTrackingProps {
  pharmacyId: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "Pending" },
  picked_up: { icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Picked Up" },
  in_transit: { icon: Truck, color: "text-purple-600 bg-purple-50 border-purple-200", label: "In Transit" },
  delivered: { icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200", label: "Delivered" },
};

export const PharmacyDeliveryTracking = ({ pharmacyId }: DeliveryTrackingProps) => {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["pharmacy-deliveries", pharmacyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_tracking")
        .select("*, order:orders(id, total_amount, patient_id)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!pharmacyId,
  });

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
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
