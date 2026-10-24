-- Stage C1 P2-2: delivery chain-of-custody INSERT lockdown.
--
-- LIVE before this migration: delivery_seals, delivery_photos and
-- delivery_status_history each had INSERT policy roles={public}
-- WITH CHECK (true) — anyone, including anon, could forge
-- chain-of-custody rows for any delivery.
--
-- Call-site audit (src/): the ONLY client insert into any of the three
-- tables is delivery_status_history from src/services/deliveryService.ts
-- (autoAssignCourier + updateDeliveryStatus — operational actors).
-- No client inserts delivery_seals / delivery_photos at all, and no
-- SECURITY DEFINER function/trigger writes delivery_status_history
-- (prosrc scan, 2026-10-24). No patient call site inserts custody
-- records, so patients are NOT granted INSERT on any of the three.
--
-- New INSERT rule for all three tables: authenticated caller who
-- participates in that delivery in an operational role — the assigned
-- courier (couriers.user_id = auth.uid() via delivery_orders.courier_id)
-- OR pharmacy staff of the delivery's pharmacy
-- (is_institution_staff_member(delivery_orders.pharmacy_id)).
--
-- The check MUST go through a SECURITY DEFINER helper, not an inline
-- EXISTS mirroring the SELECT policies: proven live 2026-10-24 that the
-- inline form can never pass for a courier. public.couriers has RLS
-- enabled with ZERO policies, so every RLS-filtered EXISTS against
-- couriers (and, transitively, the courier branch of delivery_orders'
-- own SELECT policies) evaluates empty for real callers — an assigned
-- courier's INSERT was refused 403 with the inline form, and the same
-- defect already makes "Couriers view assigned" return [] live. The
-- definer helper evaluates the identical predicate with RLS bypassed
-- inside, exactly like is_institution_staff_member already does for
-- the pharmacy-staff branch.
--
-- Known pre-existing residue (NOT changed here, INSERT scope only):
-- the SELECT policies on these three tables still use the inline
-- couriers EXISTS, so a courier cannot read back custody rows and a
-- PostgREST INSERT with Prefer: return=representation fails for
-- couriers even though the INSERT itself is permitted (201 with
-- return=minimal, which is what src/services/deliveryService.ts
-- uses). Fixing courier SELECT visibility is a follow-up item.

CREATE OR REPLACE FUNCTION public.can_insert_delivery_custody(p_delivery_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_orders
    WHERE delivery_orders.id = p_delivery_order_id
      AND (
        EXISTS (
          SELECT 1 FROM public.couriers
          WHERE couriers.id = delivery_orders.courier_id
            AND couriers.user_id = auth.uid()
        )
        OR (
          delivery_orders.pharmacy_id IS NOT NULL
          AND public.is_institution_staff_member(delivery_orders.pharmacy_id)
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_insert_delivery_custody(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_insert_delivery_custody(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Create delivery seals" ON public.delivery_seals;
CREATE POLICY "Operational participants can create delivery seals"
  ON public.delivery_seals FOR INSERT TO authenticated
  WITH CHECK (public.can_insert_delivery_custody(delivery_order_id));

DROP POLICY IF EXISTS "Create delivery photos" ON public.delivery_photos;
CREATE POLICY "Operational participants can create delivery photos"
  ON public.delivery_photos FOR INSERT TO authenticated
  WITH CHECK (public.can_insert_delivery_custody(delivery_order_id));

DROP POLICY IF EXISTS "Create delivery history" ON public.delivery_status_history;
CREATE POLICY "Operational participants can create delivery history"
  ON public.delivery_status_history FOR INSERT TO authenticated
  WITH CHECK (public.can_insert_delivery_custody(delivery_order_id));
