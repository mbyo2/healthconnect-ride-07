import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck, MapPin, Clock, Phone, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface DeliveryOrder {
  id: string;
  order_type: string;
  status: string;
  distance_km?: number;
  delivery_fee: number;
  total_amount: number;
  patient_address?: string;
  pickup_address?: string;
  estimated_arrival?: string;
  created_at: string;
  couriers?: {
    full_name?: string;
    phone?: string;
    vehicle_type?: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Finding Courier', color: 'bg-yellow-500', icon: Clock },
  assigned: { label: 'Courier Assigned', color: 'bg-blue-500', icon: Truck },
  picked_up: { label: 'Picked Up', color: 'bg-indigo-500', icon: Package },
  in_transit: { label: 'On the Way', color: 'bg-purple-500', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500', icon: XCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
};

const STATUS_STEPS = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];

export function PatientDeliveryTracking() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDeliveries();

    // Real-time updates
    const channel = supabase
      .channel('patient-deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_orders',
          filter: `patient_id=eq.${user.id}`,
        },
        () => fetchDeliveries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchDeliveries = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('delivery_orders')
      .select(`
        *,
        couriers (full_name, phone, vehicle_type)
      `)
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setDeliveries((data as any) || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading deliveries...</div>;
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No deliveries yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your medicine and service deliveries will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {deliveries.map((delivery) => {
        const config = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.pending;
        const Icon = config.icon;
        const currentStep = STATUS_STEPS.indexOf(delivery.status);

        return (
          <Card key={delivery.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {delivery.order_type === 'medicine' ? 'Medicine Delivery' : 'Service Visit'}
                </CardTitle>
                <Badge className={config.color}>{config.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Progress steps */}
              {currentStep >= 0 && delivery.status !== 'cancelled' && delivery.status !== 'failed' && (
                <div className="flex items-center gap-1">
                  {STATUS_STEPS.map((step, idx) => (
                    <div key={step} className="flex items-center flex-1">
                      <div
                        className={`h-2 rounded-full flex-1 ${
                          idx <= currentStep ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                      {idx < STATUS_STEPS.length - 1 && <div className="w-1" />}
                    </div>
                  ))}
                </div>
              )}

              {/* Addresses */}
              <div className="space-y-1 text-sm">
                {delivery.pickup_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">From: {delivery.pickup_address}</span>
                  </div>
                )}
                {delivery.patient_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>To: {delivery.patient_address}</span>
                  </div>
                )}
              </div>

              {/* Courier info */}
              {delivery.couriers && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {delivery.couriers.full_name || 'Courier'}
                    </span>
                    {delivery.couriers.vehicle_type && (
                      <span className="text-xs text-muted-foreground">
                        • {delivery.couriers.vehicle_type}
                      </span>
                    )}
                  </div>
                  {delivery.couriers.phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${delivery.couriers.phone}`}>
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {delivery.distance_km ? `${delivery.distance_km} km` : ''} 
                  {delivery.delivery_fee > 0 && ` • K${delivery.delivery_fee} delivery`}
                </span>
                <span>{formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}</span>
              </div>

              {delivery.estimated_arrival && delivery.status !== 'delivered' && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Estimated arrival: {new Date(delivery.estimated_arrival).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
