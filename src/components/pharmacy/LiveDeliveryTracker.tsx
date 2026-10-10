import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, Package, CheckCircle, Clock, Navigation } from "lucide-react";

// Fix default marker icons for Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_STEPS = ["assigned", "picked_up", "in_transit", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  assigned: "Rider assigned",
  picked_up: "Picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  pending: "Preparing",
};

interface Props {
  orderId: string;
}

export const LiveDeliveryTracker = ({ orderId }: Props) => {
  const [positions, setPositions] = useState<[number, number][]>([]);

  // Delivery status
  const { data: delivery } = useQuery({
    queryKey: ["delivery", orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_tracking")
        .select("*, courier:couriers!delivery_tracking_driver_id_fkey(full_name, phone, vehicle_type)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000, // poll every 15s
  });

  // Live GPS trail
  const { data: trail = [] } = useQuery({
    queryKey: ["delivery-trail", delivery?.id],
    queryFn: async () => {
      if (!delivery?.id) return [];
      const { data, error } = await (supabase as any)
        .from("location_updates")
        .select("latitude, longitude, timestamp")
        .eq("delivery_id", delivery.id)
        .order("timestamp", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!delivery?.id,
    refetchInterval: 10000, // live-ish updates every 10s
  });

  useEffect(() => {
    if (trail.length > 0) {
      setPositions(trail.map((t: any) => [Number(t.latitude), Number(t.longitude)] as [number, number]));
    }
  }, [trail]);

  // Realtime subscription for new location pings
  useEffect(() => {
    if (!delivery?.id) return;
    const channel = supabase
      .channel(`delivery-${delivery.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_updates",
          filter: `delivery_id=eq.${delivery.id}`,
        },
        (payload: any) => {
          const { latitude, longitude } = payload.new;
          setPositions((prev) => [...prev, [Number(latitude), Number(longitude)]]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [delivery?.id]);

  if (!delivery) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No delivery tracking yet for this order.
        </CardContent>
      </Card>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(delivery.status);
  const latestPos = positions[positions.length - 1];
  // Default to Lusaka if no GPS yet
  const center: [number, number] = latestPos || [-15.3875, 28.3228];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Live Delivery Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status timeline */}
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  i <= currentStep ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStep || delivery.status === "delivered" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : i === currentStep ? (
                  <Navigation className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs mt-1 text-center">{STATUS_LABELS[step]}</span>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`h-0.5 w-full mt-[-20px] ${i < currentStep ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {delivery.courier && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">
              Rider: {delivery.courier.full_name} · {delivery.courier.vehicle_type}
            </Badge>
          </div>
        )}

        {/* Live map */}
        <div className="h-[300px] rounded-lg overflow-hidden border">
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positions.length > 1 && (
              <Polyline positions={positions} color="#2563eb" weight={4} />
            )}
            {latestPos && (
              <Marker position={latestPos}>
                <Popup>
                  Rider location
                  <br />
                  Updated just now
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {positions.length > 0
            ? `Live · ${positions.length} location updates`
            : "Waiting for rider to share location…"}
        </p>
      </CardContent>
    </Card>
  );
};
