-- Stage follow-ups (launch ledger §7 #13): courier ADMIN tables policy set.
--
-- LIVE before this migration (verified 2026-10-25 via pg_policies):
-- public.courier_documents, public.courier_incidents and
-- public.courier_screenings all have RLS ENABLED with ZERO policies, so
-- every API caller reads them as empty and every write is refused. The
-- F2 fix (20261025_stagec2b_f2_courier_rls) deliberately left them
-- alone: no courier-facing policy existed to rewrite, and the tables
-- are ADMIN-side (screening/verification workflow + incident register).
-- The one live consumer, src/components/pharmacy/CourierScreening.tsx,
-- SELECTs courier_screenings joined to couriers (filtered by the
-- courier's pharmacy_id) and UPDATEs approval fields — both dead
-- against the zero-policy tables until now. courier_documents hangs
-- off courier_screenings (screening_id FK); courier_incidents and
-- courier_screenings hang off couriers (courier_id FK). All three
-- tables hold ZERO rows live.
--
-- Policy set (the F2 house pattern — cross-table checks live in
-- SECURITY DEFINER helpers with pinned search_path, never inline in
-- the policy; every policy is TO authenticated):
--   * Platform admins (has_role admin / super_admin) manage all rows.
--   * Institution admins manage rows for couriers of THEIR institution
--     (the courier's institution_id or pharmacy_id, resolved through
--     the couriers anchor row) — the exact scope the F2 helper
--     can_manage_courier_verification already enforces for
--     courier_verifications, mirrored here under a table-accurate name.
--     Deliberately NOT widened to institution staff members: these are
--     verification/incident records, and the closest sibling policy set
--     (courier_verifications) is admin-only on the institution branch.
--   * A courier can SELECT their own screening, their own documents
--     and their own incidents (read-only — verification outcomes are
--     never courier-writable; same posture as courier_verifications,
--     where the courier branch is SELECT-only).
--   * Everyone else (other institutions' admins, unrelated users,
--     anon) gets nothing.
--
-- NOT touched: couriers base policies, delivery_orders,
-- courier_locations, custody helpers (can_insert_delivery_custody),
-- courier_verifications — the F2 semantics stand exactly as proven.

-- ── Helpers ─────────────────────────────────────────────────────────

-- Who may manage a courier's admin-side records: institution admin of
-- the courier's institution_id / pharmacy_id, or a platform
-- admin / super_admin. Body mirrors public.can_manage_courier_verification
-- (F2) verbatim in scope; kept as a separate helper so the
-- verifications policies stay frozen and this name reads accurately
-- on screenings / incidents / documents policies.
CREATE OR REPLACE FUNCTION public.can_manage_courier_record(p_courier_id uuid)
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

REVOKE EXECUTE ON FUNCTION public.can_manage_courier_record(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_courier_record(uuid) TO authenticated, service_role;

-- courier_documents anchor on the screening row, not the courier:
-- resolve screening -> courier, then apply the record scope.
CREATE OR REPLACE FUNCTION public.can_manage_courier_document(p_screening_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courier_screenings s
    WHERE s.id = p_screening_id
      AND public.can_manage_courier_record(s.courier_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_courier_document(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_courier_document(uuid) TO authenticated, service_role;

-- Courier ownership of a document, via its screening row.
CREATE OR REPLACE FUNCTION public.is_own_courier_document(p_screening_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courier_screenings s
    JOIN public.couriers c ON c.id = s.courier_id
    WHERE s.id = p_screening_id AND c.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_own_courier_document(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_courier_document(uuid) TO authenticated, service_role;

-- ── courier_screenings ──────────────────────────────────────────────

CREATE POLICY "Couriers view own screening"
  ON public.courier_screenings FOR SELECT TO authenticated
  USING (public.is_courier_row(courier_id));

CREATE POLICY "Admins manage courier screenings"
  ON public.courier_screenings FOR ALL TO authenticated
  USING (public.can_manage_courier_record(courier_id))
  WITH CHECK (public.can_manage_courier_record(courier_id));

-- ── courier_incidents ───────────────────────────────────────────────

CREATE POLICY "Couriers view own incidents"
  ON public.courier_incidents FOR SELECT TO authenticated
  USING (public.is_courier_row(courier_id));

CREATE POLICY "Admins manage courier incidents"
  ON public.courier_incidents FOR ALL TO authenticated
  USING (public.can_manage_courier_record(courier_id))
  WITH CHECK (public.can_manage_courier_record(courier_id));

-- ── courier_documents ───────────────────────────────────────────────

CREATE POLICY "Couriers view own documents"
  ON public.courier_documents FOR SELECT TO authenticated
  USING (public.is_own_courier_document(screening_id));

CREATE POLICY "Admins manage courier documents"
  ON public.courier_documents FOR ALL TO authenticated
  USING (public.can_manage_courier_document(screening_id))
  WITH CHECK (public.can_manage_courier_document(screening_id));
