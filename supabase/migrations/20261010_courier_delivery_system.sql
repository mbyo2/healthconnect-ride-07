-- Yango-level courier/delivery system
-- CEO commissioned 2026-10-10: live GPS tracking, real courier/rider system,
-- automated dispatch, patient-facing live order view.

-- ── Couriers ──
CREATE TABLE IF NOT EXISTS public.couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'motorbike'
    CHECK (vehicle_type IN ('motorbike', 'bicycle', 'car', 'van', 'on_foot')),
  vehicle_plate TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_couriers_available
  ON public.couriers(is_active, is_available) WHERE is_active AND is_available;
CREATE INDEX IF NOT EXISTS idx_couriers_institution
  ON public.couriers(institution_id) WHERE institution_id IS NOT NULL;

-- ── Courier location history (for live tracking + audit) ──
CREATE TABLE IF NOT EXISTS public.courier_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.delivery_tracking(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_locations_courier
  ON public.courier_locations(courier_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_courier_locations_delivery
  ON public.courier_locations(delivery_id, recorded_at DESC)
  WHERE delivery_id IS NOT NULL;

-- ── Extend delivery_tracking with courier assignment + GPS endpoints ──
ALTER TABLE public.delivery_tracking
  ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dropoff_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dropoff_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMPTZ;

-- ── Automated dispatch: nearest available courier ──
-- Returns the courier id, or NULL if none available.
-- Uses Haversine distance; caller passes pickup coordinates.
CREATE OR REPLACE FUNCTION public.dispatch_nearest_courier(
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_institution_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id UUID;
BEGIN
  SELECT c.id INTO v_courier_id
  FROM public.couriers c
  WHERE c.is_active
    AND c.is_available
    AND c.current_lat IS NOT NULL
    AND c.current_lng IS NOT NULL
    AND (p_institution_id IS NULL OR c.institution_id IS NULL OR c.institution_id = p_institution_id)
  ORDER BY (
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_pickup_lat)) * cos(radians(c.current_lat)) *
        cos(radians(c.current_lng) - radians(p_pickup_lng)) +
        sin(radians(p_pickup_lat)) * sin(radians(c.current_lat))
      ))
    )
  )
  LIMIT 1;

  RETURN v_courier_id;
END;
$$;

-- ── Assign courier to a delivery (marks courier unavailable) ──
CREATE OR REPLACE FUNCTION public.assign_courier_to_delivery(
  p_delivery_id UUID,
  p_courier_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Claim the courier only if still available (prevents double-dispatch)
  UPDATE public.couriers
  SET is_available = false, updated_at = now()
  WHERE id = p_courier_id AND is_available AND is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Courier % is no longer available', p_courier_id;
  END IF;

  UPDATE public.delivery_tracking
  SET courier_id = p_courier_id,
      status = 'assigned',
      dispatched_at = now(),
      updated_at = now()
  WHERE id = p_delivery_id;
END;
$$;

-- ── Release courier when delivery completes ──
CREATE OR REPLACE FUNCTION public.release_courier(p_delivery_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id UUID;
BEGIN
  SELECT courier_id INTO v_courier_id
  FROM public.delivery_tracking WHERE id = p_delivery_id;

  IF v_courier_id IS NOT NULL THEN
    UPDATE public.couriers
    SET is_available = true,
        total_deliveries = total_deliveries + 1,
        updated_at = now()
    WHERE id = v_courier_id;
  END IF;
END;
$$;

-- ── RLS ──
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_locations ENABLE ROW LEVEL SECURITY;

-- Couriers manage their own record
DROP POLICY IF EXISTS "couriers_own_record" ON public.couriers;
CREATE POLICY "couriers_own_record" ON public.couriers
  FOR ALL USING (auth.uid() = user_id);

-- Service role / admins manage all (via SECURITY DEFINER functions above for dispatch)
-- Authenticated users can see active couriers (for dispatch UI)
DROP POLICY IF EXISTS "couriers_visible" ON public.couriers;
CREATE POLICY "couriers_visible" ON public.couriers
  FOR SELECT USING (is_active = true);

-- Location: courier writes own; patient reads courier on their delivery
DROP POLICY IF EXISTS "courier_locations_write_own" ON public.courier_locations;
CREATE POLICY "courier_locations_write_own" ON public.courier_locations
  FOR INSERT WITH CHECK (
    courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "courier_locations_read" ON public.courier_locations;
CREATE POLICY "courier_locations_read" ON public.courier_locations
  FOR SELECT USING (
    courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
    OR
    delivery_id IN (
      SELECT dt.id FROM public.delivery_tracking dt
      JOIN public.orders o ON o.id = dt.order_id
      WHERE o.patient_id = auth.uid()
    )
  );

COMMENT ON TABLE public.couriers IS 'Delivery riders for pharmacy/marketplace orders. CEO-commissioned Yango-level system 2026-10-10.';
COMMENT ON FUNCTION public.dispatch_nearest_courier IS 'Automated dispatch: nearest available courier by Haversine distance.';
