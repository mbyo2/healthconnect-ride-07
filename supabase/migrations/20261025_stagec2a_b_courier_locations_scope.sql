-- Stage C2a Cluster B — P2-1: courier_locations SELECT scoping.
--
-- The audit found a FOR SELECT TO authenticated USING (true) policy
-- (added by 20261020_delivery_order_creation.sql) letting every
-- signed-in user follow every courier's live GPS. That policy is GONE
-- live — a later stage replaced it with "Authenticated read courier
-- locations". But live verification (2026-10-24) shows the replacement
-- is broken in the other direction:
--
--   courier_locations.delivery_id has an FK to delivery_tracking(id)
--   (NOT delivery_orders), and delivery_tracking.order_id references
--   the marketplace orders table. The surviving policy joins
--   delivery_id against delivery_orders.id, so its customer and
--   institution-staff branches can never match a real row — only the
--   courier themselves and platform admins could actually read
--   locations. The customer-facing live tracking the CEO commissioned
--   (patient watches their medicine delivery) was silently dead.
--
-- Fix: resolve the linkage that actually exists —
-- courier_locations.delivery_id -> delivery_tracking -> orders —
-- inside a SECURITY DEFINER helper (cross-table checks never sit
-- inline in a policy), and scope SELECT to exactly:
--   * the courier themselves (couriers.user_id, or the tracking row's
--     driver_id),
--   * the customer of the linked order (orders.patient_id),
--   * staff / owner of the fulfilling institution (orders.pharmacy_id),
--   * platform admin / super_admin.
-- The "Couriers manage own locations" FOR ALL policy (courier writes
-- their own positions) is untouched.

CREATE OR REPLACE FUNCTION public.can_view_courier_location(p_courier_id uuid, p_delivery_tracking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.couriers c
      WHERE c.id = p_courier_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.delivery_tracking dt
      WHERE dt.id = p_delivery_tracking_id AND dt.driver_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.delivery_tracking dt
      JOIN public.orders o ON o.id = dt.order_id
      WHERE dt.id = p_delivery_tracking_id
        AND (
          o.patient_id = auth.uid()
          OR public.is_institution_staff_member(o.pharmacy_id)
          OR public.is_institution_admin(o.pharmacy_id)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_courier_location(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_courier_location(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated read courier locations" ON public.courier_locations;

CREATE POLICY "Scoped read courier locations"
  ON public.courier_locations
  FOR SELECT
  TO authenticated
  USING (public.can_view_courier_location(courier_id, delivery_id));
