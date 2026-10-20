import { supabase } from '@/integrations/supabase/client';

export interface DeliveryOrder {
  id: string;
  order_type: 'medicine' | 'medical_service' | 'lab_sample';
  pharmacy_id?: string;
  marketplace_order_id?: string;
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

/** Create a delivery order for medicine from pharmacy.
 *
 * Coordinates are optional: marketplace orders carry a delivery address but
 * not always GPS coordinates. When both endpoints are known we compute the
 * real distance + fee; otherwise the delivery is created with no distance
 * and a K0 fee (staff confirm the fee with the patient) rather than
 * inventing coordinates.
 *
 * When marketplaceOrderId is given the creation is idempotent — the
 * one-delivery-per-order unique index (20261020_delivery_order_creation)
 * turns a duplicate call into a lookup of the existing delivery.
 */
export async function createMedicineDelivery(params: {
  pharmacyId: string;
  patientId: string;
  patientLat?: number | null;
  patientLng?: number | null;
  patientAddress: string;
  patientPhone: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress: string;
  items: any[];
  totalAmount: number;
  prescriptionId?: string;
  marketplaceOrderId?: string;
  notes?: string;
}): Promise<{ data?: DeliveryOrder; error?: string }> {
  const hasRoute =
    params.pickupLat != null && params.pickupLng != null &&
    params.patientLat != null && params.patientLng != null;
  const distanceKm = hasRoute
    ? haversineKm(params.pickupLat!, params.pickupLng!, params.patientLat!, params.patientLng!)
    : null;
  const deliveryFee = distanceKm != null ? calculateDeliveryFee(distanceKm) : 0;

  const { data, error } = await (supabase as any)
    .from('delivery_orders')
    .insert({
      order_type: 'medicine',
      pharmacy_id: params.pharmacyId,
      patient_id: params.patientId,
      patient_latitude: params.patientLat ?? null,
      patient_longitude: params.patientLng ?? null,
      patient_address: params.patientAddress,
      patient_phone: params.patientPhone,
      pickup_latitude: params.pickupLat ?? null,
      pickup_longitude: params.pickupLng ?? null,
      pickup_address: params.pickupAddress,
      distance_km: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      delivery_fee: deliveryFee,
      items: params.items,
      total_amount: params.totalAmount,
      prescription_id: params.prescriptionId,
      marketplace_order_id: params.marketplaceOrderId ?? null,
      notes: params.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    // Duplicate handoff (unique marketplace_order_id): return the existing
    // delivery order instead of failing — fulfilment retries stay safe.
    if ((error as any).code === '23505' && params.marketplaceOrderId) {
      const existing = await getDeliveryByMarketplaceOrder(params.marketplaceOrderId);
      if (existing) return { data: existing };
    }
    return { error: error.message };
  }

  // Auto-assign nearest available courier (institution drivers first, then platform).
  // Needs pickup coordinates; without them the delivery stays 'pending' for
  // manual dispatch from the pharmacy board.
  if (params.pickupLat != null && params.pickupLng != null) {
    await autoAssignCourier(data.id, params.pickupLat, params.pickupLng, params.pharmacyId);
  }

  return { data: data as DeliveryOrder };
}

/** Look up the courier delivery created for a marketplace order, if any. */
export async function getDeliveryByMarketplaceOrder(
  marketplaceOrderId: string
): Promise<DeliveryOrder | null> {
  const { data } = await (supabase as any)
    .from('delivery_orders')
    .select('*')
    .eq('marketplace_order_id', marketplaceOrderId)
    .maybeSingle();
  return (data as DeliveryOrder) || null;
}

/**
 * Pharmacy fulfilment handoff: make sure a marketplace order has a courier
 * delivery order, creating one from data the platform already holds
 * (smooth-data principle — nothing is re-typed):
 *   - dropoff: the order's delivery_address / delivery_phone (+ the
 *     patient's saved profile coordinates when present)
 *   - pickup: the pharmacy institution's address + coordinates
 *   - items: the order lines with product names
 * Idempotent — safe to call on fulfil and again from a "hand to courier"
 * retry action.
 */
export async function ensureDeliveryOrderForOrder(
  orderId: string
): Promise<{ data?: DeliveryOrder; created?: boolean; error?: string }> {
  const existing = await getDeliveryByMarketplaceOrder(orderId);
  if (existing) return { data: existing, created: false };

  const sb: any = supabase;

  const { data: order, error: orderError } = await sb
    .from('orders')
    .select('id, patient_id, pharmacy_id, total_amount, prescription_id, delivery_address, delivery_phone, delivery_instructions')
    .eq('id', orderId)
    .single();
  if (orderError || !order) return { error: orderError?.message || 'Order not found' };
  if (!order.pharmacy_id) return { error: 'Order has no pharmacy assigned' };

  const [{ data: items }, { data: pharmacy }, { data: patientProfile }] = await Promise.all([
    sb
      .from('order_items')
      .select('quantity, marketplace_products(medication_name)')
      .eq('order_id', orderId),
    sb
      .from('healthcare_institutions')
      .select('name, address, city, latitude, longitude')
      .eq('id', order.pharmacy_id)
      .maybeSingle(),
    sb
      .from('profiles')
      .select('latitude, longitude')
      .eq('id', order.patient_id)
      .maybeSingle(),
  ]);

  const deliveryItems = (items || []).map((i: any) => ({
    name: i.marketplace_products?.medication_name || 'Medication',
    quantity: i.quantity,
  }));

  const pickupAddress = pharmacy
    ? [pharmacy.name, pharmacy.address, pharmacy.city].filter(Boolean).join(', ')
    : 'Pharmacy';

  const result = await createMedicineDelivery({
    pharmacyId: order.pharmacy_id,
    patientId: order.patient_id,
    patientLat: patientProfile?.latitude ?? null,
    patientLng: patientProfile?.longitude ?? null,
    patientAddress: order.delivery_address,
    patientPhone: order.delivery_phone,
    pickupLat: pharmacy?.latitude ?? null,
    pickupLng: pharmacy?.longitude ?? null,
    pickupAddress,
    items: deliveryItems,
    totalAmount: order.total_amount ?? 0,
    prescriptionId: order.prescription_id ?? undefined,
    marketplaceOrderId: order.id,
    notes: order.delivery_instructions ?? undefined,
  });

  if (result.error) return { error: result.error };
  return { data: result.data, created: true };
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

  // Get their latest locations (courier_locations columns are lat/lng with
  // recorded_at — see 20261010_courier_delivery_system.sql; the previous
  // latitude/longitude/created_at names never existed and failed silently)
  const courierIds = couriers.map((c: any) => c.id);
  const { data: locations } = await (supabase as any)
    .from('courier_locations')
    .select('courier_id, lat, lng')
    .in('courier_id', courierIds)
    .order('recorded_at', { ascending: false });

  // Find nearest
  let nearest: any = null;
  let minDist = Infinity;
  const seen = new Set();

  for (const loc of locations || []) {
    if (seen.has(loc.courier_id)) continue;
    seen.add(loc.courier_id);
    if (loc.lat == null || loc.lng == null) continue;

    const dist = haversineKm(pickupLat, pickupLng, loc.lat, loc.lng);
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
