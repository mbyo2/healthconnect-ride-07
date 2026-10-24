-- Stage C2b FIX F2: couriers cannot operate — RLS deadlock.
--
-- LIVE before this migration (verified 2026-10-24 via pg_policies):
-- public.couriers has RLS ENABLED with ZERO policies, so for every
-- API caller the table reads as empty. Every courier-facing policy
-- that tests membership with an inline EXISTS against couriers is
-- therefore always false:
--   * delivery_orders  "Couriers view assigned"   (SELECT)
--   * delivery_orders  "Couriers update assigned" (UPDATE)
--   * courier_locations "Couriers manage own locations" (ALL)
--   * delivery_status_history "View delivery history" (SELECT, nested
--     couriers EXISTS inside a delivery_orders EXISTS — courier branch
--     dead; the patient branch only worked because the caller's own
--     "Patients view own deliveries" policy satisfied the outer EXISTS)
--   * delivery_seals   "View delivery seals"   (SELECT, same nesting)
--   * delivery_photos  "View delivery photos"  (SELECT, same nesting)
--   * courier_verifications "Couriers view own verifications" (SELECT)
--   * courier_verifications "Institution admins manage courier
--     verifications" (ALL — its couriers anchor row is invisible, so
--     even platform/institution admins could not match it)
--   * delivery_incidents "View incidents" (SELECT, courier branch)
-- Proven live in Stage C2b Cluster E (J3): an assigned courier's PATCH
-- on their delivery returned 200 with [] and the row never changed;
-- their courier_locations POST returned 403. Custody INSERTs worked
-- only because C1 already routed them through the SECURITY DEFINER
-- helper can_insert_delivery_custody (NOT touched here).
--
-- Fix pattern (the house one, C1/C2a): every cross-table courier check
-- moves into a SECURITY DEFINER helper with pinned search_path, which
-- is opaque to the RLS rewriter and bypasses RLS internally. Policies
-- keep their names and their exact intended scope; only the dead
-- inline EXISTS is replaced by a helper call. Rewritten policies are
-- TO authenticated (the old {public} scope could never match: every
-- branch requires auth.uid(); anon gains/loses nothing).
--
-- couriers itself gets the missing base policies: a courier reads and
-- updates their own row (user_id = auth.uid(), a direct column check —
-- no subquery), platform admins manage all rows, staff/admins of the
-- courier's linked institution manage that institution's couriers
-- (CourierManager / CourierScreening / dispatch flows, via the
-- existing DEFINER institution helpers), and a patient can read the
-- courier row assigned to their own delivery (PatientDeliveryTracking
-- embeds couriers full_name/phone/vehicle_type through delivery_orders).
--
-- NOT touched (proven access preserved exactly):
--   * courier_locations "Scoped read courier locations" +
--     can_view_courier_location (P2-1 customer location reads)
--   * delivery_orders patient + pharmacy-staff policies
--   * custody INSERT policies via can_insert_delivery_custody (P2-2)
--   * delivery_tracking policies (no courier-facing policy exists;
--     its staff UPDATE uses orders/institution_personnel, not couriers)
--   * delivery_incidents "Report incidents" INSERT (reported_by check)
-- Observed residue, NOT fixed here (no courier-facing policy exists to
-- rewrite; separate scope decision): courier_documents,
-- courier_incidents and courier_screenings also have RLS on with zero
-- policies.

-- ── Helpers ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_courier_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id FROM public.couriers c WHERE c.user_id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.current_courier_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_courier_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_courier_row(p_courier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couriers c
    WHERE c.id = p_courier_id AND c.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_courier_row(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_courier_row(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_assigned_courier(p_delivery_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_orders d
    JOIN public.couriers c ON c.id = d.courier_id
    WHERE d.id = p_delivery_order_id AND c.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_assigned_courier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_courier(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_courier_assigned_to_patient(p_courier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_orders d
    WHERE d.courier_id = p_courier_id AND d.patient_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_courier_assigned_to_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_courier_assigned_to_patient(uuid) TO authenticated, service_role;

-- Exact semantics of the old "View delivery history" qual:
-- the delivery's patient, or its assigned courier.
CREATE OR REPLACE FUNCTION public.can_view_delivery_history(p_delivery_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_orders d
    WHERE d.id = p_delivery_order_id
      AND (
        d.patient_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.couriers c
          WHERE c.id = d.courier_id AND c.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_delivery_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_delivery_history(uuid) TO authenticated, service_role;

-- Exact semantics of the old "View delivery seals" / "View delivery
-- photos" quals: patient, assigned courier, or pharmacy staff member.
CREATE OR REPLACE FUNCTION public.can_view_delivery_seal_or_photo(p_delivery_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_orders d
    WHERE d.id = p_delivery_order_id
      AND (
        d.patient_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.couriers c
          WHERE c.id = d.courier_id AND c.user_id = auth.uid()
        )
        OR (
          d.pharmacy_id IS NOT NULL
          AND public.is_institution_staff_member(d.pharmacy_id)
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_delivery_seal_or_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_delivery_seal_or_photo(uuid) TO authenticated, service_role;

-- Exact semantics of the old "Institution admins manage courier
-- verifications" qual, anchored on the courier row: institution admin
-- of the courier's institution_id or pharmacy_id, or platform
-- admin / super_admin (the old inline user_roles EXISTS is has_role).
CREATE OR REPLACE FUNCTION public.can_manage_courier_verification(p_courier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couriers c
    WHERE c.id = p_courier_id
      AND (
        (c.institution_id IS NOT NULL AND public.is_institution_admin(c.institution_id))
        OR (c.pharmacy_id IS NOT NULL AND public.is_institution_admin(c.pharmacy_id))
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_courier_verification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_courier_verification(uuid) TO authenticated, service_role;

-- Exact semantics of the old delivery_incidents "View incidents" qual:
-- the reporter, the incident's courier, or a platform admin.
CREATE OR REPLACE FUNCTION public.can_view_delivery_incident(p_reported_by uuid, p_courier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_reported_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.couriers c
      WHERE c.id = p_courier_id AND c.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_delivery_incident(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_delivery_incident(uuid, uuid) TO authenticated, service_role;

-- ── couriers: the missing base policies ─────────────────────────────

CREATE POLICY "Couriers view own record"
  ON public.couriers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Couriers update own record"
  ON public.couriers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform admins manage couriers"
  ON public.couriers FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Institution manages own couriers"
  ON public.couriers FOR ALL TO authenticated
  USING (
    (pharmacy_id IS NOT NULL AND (
      public.is_institution_staff_member(pharmacy_id)
      OR public.is_institution_admin(pharmacy_id)
    ))
    OR (institution_id IS NOT NULL AND (
      public.is_institution_staff_member(institution_id)
      OR public.is_institution_admin(institution_id)
    ))
  )
  WITH CHECK (
    (pharmacy_id IS NOT NULL AND (
      public.is_institution_staff_member(pharmacy_id)
      OR public.is_institution_admin(pharmacy_id)
    ))
    OR (institution_id IS NOT NULL AND (
      public.is_institution_staff_member(institution_id)
      OR public.is_institution_admin(institution_id)
    ))
  );

CREATE POLICY "Patients view assigned courier"
  ON public.couriers FOR SELECT TO authenticated
  USING (public.is_courier_assigned_to_patient(id));

-- ── delivery_orders: courier-facing rewrites ────────────────────────

DROP POLICY IF EXISTS "Couriers view assigned" ON public.delivery_orders;
CREATE POLICY "Couriers view assigned"
  ON public.delivery_orders FOR SELECT TO authenticated
  USING (public.is_assigned_courier(id));

DROP POLICY IF EXISTS "Couriers update assigned" ON public.delivery_orders;
CREATE POLICY "Couriers update assigned"
  ON public.delivery_orders FOR UPDATE TO authenticated
  USING (public.is_assigned_courier(id))
  WITH CHECK (public.is_assigned_courier(id));

-- ── courier_locations: courier write/own-row rewrite ───────────────
-- ("Scoped read courier locations" / can_view_courier_location stay.)

DROP POLICY IF EXISTS "Couriers manage own locations" ON public.courier_locations;
CREATE POLICY "Couriers manage own locations"
  ON public.courier_locations FOR ALL TO authenticated
  USING (public.is_courier_row(courier_id))
  WITH CHECK (public.is_courier_row(courier_id));

-- ── Custody SELECT rewrites (INSERT side untouched) ─────────────────

DROP POLICY IF EXISTS "View delivery history" ON public.delivery_status_history;
CREATE POLICY "View delivery history"
  ON public.delivery_status_history FOR SELECT TO authenticated
  USING (public.can_view_delivery_history(delivery_order_id));

DROP POLICY IF EXISTS "View delivery seals" ON public.delivery_seals;
CREATE POLICY "View delivery seals"
  ON public.delivery_seals FOR SELECT TO authenticated
  USING (public.can_view_delivery_seal_or_photo(delivery_order_id));

DROP POLICY IF EXISTS "View delivery photos" ON public.delivery_photos;
CREATE POLICY "View delivery photos"
  ON public.delivery_photos FOR SELECT TO authenticated
  USING (public.can_view_delivery_seal_or_photo(delivery_order_id));

-- ── courier_verifications rewrites ──────────────────────────────────

DROP POLICY IF EXISTS "Couriers view own verifications" ON public.courier_verifications;
CREATE POLICY "Couriers view own verifications"
  ON public.courier_verifications FOR SELECT TO authenticated
  USING (public.is_courier_row(courier_id));

DROP POLICY IF EXISTS "Institution admins manage courier verifications" ON public.courier_verifications;
CREATE POLICY "Institution admins manage courier verifications"
  ON public.courier_verifications FOR ALL TO authenticated
  USING (public.can_manage_courier_verification(courier_id))
  WITH CHECK (public.can_manage_courier_verification(courier_id));

-- ── delivery_incidents rewrite ──────────────────────────────────────

DROP POLICY IF EXISTS "View incidents" ON public.delivery_incidents;
CREATE POLICY "View incidents"
  ON public.delivery_incidents FOR SELECT TO authenticated
  USING (public.can_view_delivery_incident(reported_by, courier_id));
