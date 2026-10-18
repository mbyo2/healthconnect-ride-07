import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Phone, Navigation, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { updateDeliveryStatus } from '@/services/deliveryService';
import { toast } from 'sonner';

interface DeliveryOrder {
  id: string;
  order_type: string;
  status: string;
  patient_address?: string;
  pickup_address?: string;
  patient_phone?: string;
  patient_latitude?: number;
  patient_longitude?: number;
  pickup_latitude?: number;
  pickup_longitude?: number;
  distance_km?: number;
  items: any[];
  notes?: string;
}

export function CourierDeliveryDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [courierId, setCourierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchCourierAndDeliveries();

    const channel = supabase
      .channel('courier-deliveries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_orders' },
        () => fetchCourierAndDeliveries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCourierAndDeliveries = async () => {
    if (!user) return;
    
    // Get courier record
    const { data: courier } = await supabase
      .from('couriers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!courier) {
      setLoading(false);
      return;
    }

    setCourierId((courier as any).id);

    // Get assigned deliveries
    const { data } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('courier_id', (courier as any).id)
      .in('status', ['assigned', 'picked_up', 'in_transit'])
      .order('created_at', { ascending: true });

    setDeliveries((data as any) || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // Get current location
    let lat, lng;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;

      // Update courier location
      if (courierId) {
        await supabase.from('courier_locations').insert({
          courier_id: courierId,
          latitude: lat,
          longitude: lng,
        });
      }
    } catch {
      // Location unavailable, continue without it
    }

    const { error } = await updateDeliveryStatus(orderId, newStatus, lat, lng);
    if (error) {
      toast.error('Failed to update: ' + error);
    } else {
      toast.success('Status updated');
      fetchCourierAndDeliveries();
    }
  };

  const openNavigation = (lat?: number, lng?: number) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading deliveries...</div>;
  }

  if (!courierId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">You are not registered as a courier</p>
        </CardContent>
      </Card>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active deliveries</p>
          <p className="text-sm text-muted-foreground mt-1">
            New assignments will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {deliveries.map((delivery) => (
        <Card key={delivery.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {delivery.order_type === 'medicine' ? 'Medicine Delivery' : 'Service Visit'}
              </CardTitle>
              <Badge>{delivery.status.replace('_', ' ').toUpperCase()}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pickup */}
            <div className="p-2 bg-muted rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">PICKUP</div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{delivery.pickup_address || 'Pharmacy'}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openNavigation(delivery.pickup_latitude, delivery.pickup_longitude)}
                >
                  <Navigation className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Dropoff */}
            <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-xs font-medium text-muted-foreground mb-1">DELIVER TO</div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{delivery.patient_address}</span>
                </div>
                <div className="flex gap-1">
                  {delivery.patient_phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${delivery.patient_phone}`}>
                        <Phone className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openNavigation(delivery.patient_latitude, delivery.patient_longitude)}
                  >
                    <Navigation className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Items */}
            {delivery.items && delivery.items.length > 0 && (
              <div className="text-sm">
                <div className="font-medium mb-1">Items ({delivery.items.length})</div>
                {delivery.items.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} className="text-muted-foreground">
                    • {item.name || item.medication_name} {item.quantity && `x${item.quantity}`}
                  </div>
                ))}
                {delivery.items.length > 3 && (
                  <div className="text-muted-foreground">+{delivery.items.length - 3} more</div>
                )}
              </div>
            )}

            {delivery.distance_km && (
              <div className="text-sm text-muted-foreground">
                Distance: {delivery.distance_km} km
              </div>
            )}

            {delivery.notes && (
              <div className="text-sm p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                Note: {delivery.notes}
              </div>
            )}

            {/* Action buttons based on status */}
            <div className="flex gap-2 pt-2">
              {delivery.status === 'assigned' && (
                <Button
                  className="flex-1"
                  onClick={() => handleStatusUpdate(delivery.id, 'picked_up')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Mark Picked Up
                </Button>
              )}
              {delivery.status === 'picked_up' && (
                <Button
                  className="flex-1"
                  onClick={() => handleStatusUpdate(delivery.id, 'in_transit')}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Delivery
                </Button>
              )}
              {delivery.status === 'in_transit' && (
                <Button
                  className="flex-1"
                  onClick={() => handleStatusUpdate(delivery.id, 'delivered')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Delivered
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default CourierDeliveryDashboard;
