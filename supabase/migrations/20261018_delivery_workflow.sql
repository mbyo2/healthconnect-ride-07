-- Complete delivery workflow: orders, assignment, tracking
-- Supports medicine delivery and medical services (home visits)

CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type TEXT NOT NULL CHECK (order_type IN ('medicine', 'medical_service', 'lab_sample')),
  -- Medicine order links
  pharmacy_id UUID REFERENCES public.healthcare_institutions(id),
  prescription_id UUID,
  -- Medical service links  
  provider_id UUID REFERENCES auth.users(id),
  appointment_id UUID REFERENCES public.appointments(id),
  -- Patient
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_latitude DOUBLE PRECISION,
  patient_longitude DOUBLE PRECISION,
  patient_address TEXT,
  patient_phone TEXT,
  -- Pickup location (pharmacy or provider)
  pickup_latitude DOUBLE PRECISION,
  pickup_longitude DOUBLE PRECISION,
  pickup_address TEXT,
  -- Delivery details
  distance_km DOUBLE PRECISION,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10,2) DEFAULT 0,
  -- Status workflow: pending -> assigned -> picked_up -> in_transit -> delivered
  --                  -> cancelled (can cancel at pending/assigned)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed')
  ),
  -- Courier assignment
  courier_id UUID REFERENCES public.couriers(id),
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  -- Tracking
  estimated_arrival TIMESTAMPTZ,
  actual_distance_km DOUBLE PRECISION,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery status history for audit trail
CREATE TABLE IF NOT EXISTS public.delivery_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_orders_patient ON public.delivery_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_courier ON public.delivery_orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_pharmacy ON public.delivery_orders(pharmacy_id);

-- Enable RLS
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status_history ENABLE ROW LEVEL SECURITY;

-- Patients can view their own deliveries
CREATE POLICY "Patients view own deliveries"
ON public.delivery_orders FOR SELECT
USING (auth.uid() = patient_id);

-- Patients can create delivery orders
CREATE POLICY "Patients create deliveries"
ON public.delivery_orders FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Couriers can view assigned deliveries
CREATE POLICY "Couriers view assigned"
ON public.delivery_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.id = delivery_orders.courier_id
    AND couriers.user_id = auth.uid()
  )
);

-- Couriers can update assigned deliveries (status, location)
CREATE POLICY "Couriers update assigned"
ON public.delivery_orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.id = delivery_orders.courier_id
    AND couriers.user_id = auth.uid()
  )
);

-- Pharmacy staff can view their pharmacy's deliveries
CREATE POLICY "Pharmacy staff view deliveries"
ON public.delivery_orders FOR SELECT
USING (
  pharmacy_id IS NOT NULL AND
  public.is_institution_staff_member(pharmacy_id)
);

-- Status history: same visibility as orders
CREATE POLICY "View delivery history"
ON public.delivery_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_orders
    WHERE delivery_orders.id = delivery_status_history.delivery_order_id
    AND (
      delivery_orders.patient_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.couriers
        WHERE couriers.id = delivery_orders.courier_id
        AND couriers.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Create delivery history"
ON public.delivery_status_history FOR INSERT
WITH CHECK (true);
