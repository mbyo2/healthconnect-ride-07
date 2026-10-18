import { supabase } from '@/integrations/supabase/client';

export interface DeliveryOrder {
  id: string;
  order_type: 'medicine' | 'medical_service' | 'lab_sample';
  pharmacy_id?: string;
  provider_id?: string;
  patient_id: string;
  patient_latitude?: number;
  patient_longitude?: number;
  patient_address?: string;
  patient_phone?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_address?: string;
  distance_km?: number;
  delivery_fee: number;
  items: any[];
  total_amount: number;
  status: string;
  courier_id?: string;
  estimated_arrival?: string;
  notes?: string;
}

/** Haversine distance in kilometers */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Calculate delivery fee based on distance (ZMW) */
export function calculateDeliveryFee(distanceKm: number): number {
  // Base fee K15 for first 3km, then K5 per additional km
  if (distanceKm <= 3) return 15;
  return Math.round(15 + (distanceKm - 3) * 5);
}

/** Create a delivery order for medicine from pharmacy */
export async function createMedicineDelivery(params: {
  pharmacyId: string;
  patientId: string;
  patientLat: number;
  patientLng: number;
  patientAddress: string;
  patientPhone: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  items: any[];
  totalAmount: number;
  prescriptionId?: string;
  notes?: string;
}): Promise<{ data?: DeliveryOrder; error?: string }> {
  const distanceKm = haversineKm(
    params.pickupLat, params.pickupLng,
    params.patientLat, params.patientLng
  );
  const deliveryFee = calculateDeliveryFee(distanceKm);

  const { data, error } = await supabase
    .from('delivery_orders')
    .insert({
      order_type: 'medicine',
      pharmacy_id: params.pharmacyId,
      patient_id: params.patientId,
      patient_latitude: params.patientLat,
      patient_longitude: params.patientLng,
      patient_address: params.patientAddress,
      patient_phone: params.patientPhone,
      pickup_latitude: params.pickupLat,
      pickup_longitude: params.pickupLng,
      pickup_address: params.pickupAddress,
      distance_km: Math.round(distanceKm * 10) / 10,
      delivery_fee: deliveryFee,
      items: params.items,
      total_amount: params.totalAmount,
      prescription_id: params.prescriptionId,
      notes: params.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  
  // Auto-assign nearest available courier (institution drivers first, then platform)
  await autoAssignCourier(data.id, params.pickupLat, params.pickupLng, params.pharmacyId);
  
  return { data: data as DeliveryOrder };
}

/** Create a delivery order for medical service (home visit) */
export async function createServiceDelivery(params: {
  providerId: string;
  appointmentId: string;
  patientId: string;
  patientLat: number;
  patientLng: number;
  patientAddress: string;
  patientPhone: string;
  providerLat: number;
  providerLng: number;
  providerAddress: string;
  notes?: string;
}): Promise<{ data?: DeliveryOrder; error?: string }> {
  const distanceKm = haversineKm(
    params.providerLat, params.providerLng,
    params.patientLat, params.patientLng
  );

  const { data, error } = await supabase
    .from('delivery_orders')
    .insert({
      order_type: 'medical_service',
      provider_id: params.providerId,
      appointment_id: params.appointmentId,
      patient_id: params.patientId,
      patient_latitude: params.patientLat,
      patient_longitude: params.patientLng,
      patient_address: params.patientAddress,
      patient_phone: params.patientPhone,
      pickup_latitude: params.providerLat,
      pickup_longitude: params.providerLng,
      pickup_address: params.providerAddress,
      distance_km: Math.round(distanceKm * 10) / 10,
      delivery_fee: 0, // Service fee handled separately
      notes: params.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as DeliveryOrder };
}

/** Auto-assign the nearest available courier to a delivery order
 * Priority: 1) Institution's own drivers, 2) Platform couriers
 */
export async function autoAssignCourier(
  orderId: string,
  pickupLat: number,
  pickupLng: number,
  pharmacyId?: string,
  institutionId?: string
): Promise<boolean> {
  // First try: institution's own drivers
  let couriers: any[] = [];
  if (pharmacyId || institutionId) {
    const { data: ownCouriers } = await supabase
      .from('couriers')
      .select('id, user_id')
      .eq('is_active', true)
      .eq('is_available', true)
      .eq('verification_status', 'verified')
      .or(
        pharmacyId ? `pharmacy_id.eq.${pharmacyId}` : '' +
        institutionId ? `${pharmacyId ? ',' : ''}institution_id.eq.${institutionId}` : ''
      )
      .limit(20);
    couriers = ownCouriers || [];
  }

  // Fallback: platform couriers (no institution/pharmacy link)
  if (couriers.length === 0) {
    const { data: platformCouriers } = await supabase
      .from('couriers')
      .select('id, user_id')
      .eq('is_active', true)
      .eq('is_available', true)
      .eq('verification_status', 'verified')
      .is('pharmacy_id', null)
      .is('institution_id', null)
      .limit(20);
    couriers = platformCouriers || [];
  }

  if (couriers.length === 0) return false;

  // Get their latest locations
  const courierIds = couriers.map((c: any) => c.id);
  const { data: locations } = await supabase
    .from('courier_locations')
    .select('courier_id, latitude, longitude')
    .in('courier_id', courierIds)
    .order('created_at', { ascending: false });

  // Find nearest
  let nearest: any = null;
  let minDist = Infinity;
  const seen = new Set();
  
  for (const loc of locations || []) {
    if (seen.has(loc.courier_id)) continue;
    seen.add(loc.courier_id);
    if (loc.latitude == null || loc.longitude == null) continue;
    
    const dist = haversineKm(pickupLat, pickupLng, loc.latitude, loc.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = couriers.find((c: any) => c.id === loc.courier_id);
    }
  }

  if (!nearest) return false;

  // Assign
  const { error } = await supabase
    .from('delivery_orders')
    .update({
      courier_id: nearest.id,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
      estimated_arrival: new Date(Date.now() + minDist * 3 * 60000).toISOString(), // ~3 min per km
    })
    .eq('id', orderId);

  if (!error) {
    // Log status change
    await supabase.from('delivery_status_history').insert({
      delivery_order_id: orderId,
      from_status: 'pending',
      to_status: 'assigned',
      notes: `Auto-assigned to nearest courier (${minDist.toFixed(1)} km away)`,
    });
  }

  return !error;
}

/** Update delivery status (courier action) */
export async function updateDeliveryStatus(
  orderId: string,
  newStatus: string,
  courierLat?: number,
  courierLng?: number,
  notes?: string
): Promise<{ error?: string }> {
  const { data: order } = await supabase
    .from('delivery_orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (!order) return { error: 'Order not found' };

  const updates: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'picked_up') updates.picked_up_at = new Date().toISOString();
  if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();

  const { error } = await supabase
    .from('delivery_orders')
    .update(updates)
    .eq('id', orderId);

  if (error) return { error: error.message };

  await supabase.from('delivery_status_history').insert({
    delivery_order_id: orderId,
    from_status: (order as any).status,
    to_status: newStatus,
    latitude: courierLat,
    longitude: courierLng,
    notes,
  });

  return {};
}

/** Get patient's delivery orders with courier info */
export async function getPatientDeliveries(patientId: string) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select(`
      *,
      couriers (id, full_name, phone, vehicle_type)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data, error };
}

/** Get courier's assigned deliveries */
export async function getCourierDeliveries(courierId: string) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('courier_id', courierId)
    .in('status', ['assigned', 'picked_up', 'in_transit'])
    .order('created_at', { ascending: true });

  return { data, error };
}
