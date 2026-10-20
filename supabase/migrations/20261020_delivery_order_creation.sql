-- Delivery handoff foundation (audit fix, Cluster C, 2026-10-20)
--
-- Problem: the courier stack (delivery_orders + deliveryService) was built
-- but nothing ever created a delivery order:
--   1. delivery_orders had NO column linking back to the marketplace order
--      it fulfils, and NO INSERT policy for pharmacy staff — the only INSERT
--      policy allowed the patient (auth.uid() = patient_id), so the
--      pharmacy-side fulfilment flow could never create one.
--   2. public.courier_locations was defined in the repo migration
--      20261010_courier_delivery_system.sql but is MISSING on the live
--      database (verified via PostgREST: PGRST205), so every courier GPS
--      write/read against it silently failed.
--
-- This migration closes both gaps without inventing new shapes:
--   * marketplace_order_id link + one-delivery-per-order uniqueness
--   * pharmacy-staff INSERT policy mirroring the existing staff SELECT
--     policy (is_institution_staff_member)
--   * courier_locations created with the exact DDL from
--     20261010_courier_delivery_system.sql (IF NOT EXISTS — a no-op where
--     that migration was applied) + RLS: couriers own their rows,
--     authenticated staff can read for dispatch/tracking visibility.

-- ── 1. Link delivery_orders → marketplace orders ─────────────────────
ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS marketplace_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_orders_marketplace_order
  ON public.delivery_orders(marketplace_order_id)
  WHERE marketplace_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_orders_marketplace_order
  ON public.delivery_orders(marketplace_order_id)
  WHERE marketplace_order_id IS NOT NULL;

-- ── 2. Pharmacy staff may create delivery orders for their pharmacy ──
DROP POLICY IF EXISTS "Pharmacy staff create deliveries" ON public.delivery_orders;
CREATE POLICY "Pharmacy staff create deliveries"
ON public.delivery_orders FOR INSERT
WITH CHECK (
  pharmacy_id IS NOT NULL
  AND public.is_institution_staff_member(pharmacy_id)
);

-- ── 3. courier_locations (live catch-up, repo DDL parity) ────────────
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

ALTER TABLE public.courier_locations ENABLE ROW LEVEL SECURITY;

-- Couriers manage their own location rows (insert from the GPS hook,
-- read for their own history).
DROP POLICY IF EXISTS "Couriers manage own locations" ON public.courier_locations;
CREATE POLICY "Couriers manage own locations"
ON public.courier_locations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.id = courier_locations.courier_id
    AND couriers.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.id = courier_locations.courier_id
    AND couriers.user_id = auth.uid()
  )
);

-- Dispatch/tracking visibility: any authenticated user who can see the
-- courier (couriers are already readable by authenticated users for
-- assignment) can read positions — the patient tracking map and the
-- pharmacy dispatch board both read through this.
DROP POLICY IF EXISTS "Authenticated read courier locations" ON public.courier_locations;
CREATE POLICY "Authenticated read courier locations"
ON public.courier_locations FOR SELECT TO authenticated
USING (true);
