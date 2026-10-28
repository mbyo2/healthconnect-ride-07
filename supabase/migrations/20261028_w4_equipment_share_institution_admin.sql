-- W4 sweep 2026-10-28: institution admins (healthcare_institutions.admin_id)
-- could not see, request, decide, or cancel equipment share requests for
-- their own institution unless they also held an institution_staff /
-- institution_personnel row — is_institution_staff_member() does not cover
-- admin_id. The institution admin is the person who manages Maintenance ->
-- Assets / Shared Equipment in the app, so the share-request policies now
-- also accept the institution's own admin. Helper is SECURITY DEFINER
-- (opaque to the RLS rewriter; no cross-table inline EXISTS in policies).

CREATE OR REPLACE FUNCTION public.is_institution_admin_of(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.healthcare_institutions hi
    WHERE hi.id = p_institution_id
      AND hi.admin_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_institution_admin_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_institution_admin_of(uuid) TO authenticated, service_role;

DROP POLICY "Share request parties can view" ON public.equipment_share_requests;
CREATE POLICY "Share request parties can view" ON public.equipment_share_requests
  FOR SELECT TO authenticated
  USING (
    is_institution_staff_member(owner_institution_id)
    OR is_institution_staff_member(requester_institution_id)
    OR is_institution_admin_of(owner_institution_id)
    OR is_institution_admin_of(requester_institution_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY "Staff can request shared equipment" ON public.equipment_share_requests;
CREATE POLICY "Staff can request shared equipment" ON public.equipment_share_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_institution_staff_member(requester_institution_id) OR is_institution_admin_of(requester_institution_id))
    AND (requested_by = auth.uid())
    AND is_asset_shareable(asset_id)
    AND (owner_institution_id = asset_owner_institution(asset_id))
    AND (owner_institution_id <> requester_institution_id)
    AND (status = 'pending'::text)
  );

DROP POLICY "Owners decide share requests" ON public.equipment_share_requests;
CREATE POLICY "Owners decide share requests" ON public.equipment_share_requests
  FOR UPDATE TO authenticated
  USING (is_institution_staff_member(owner_institution_id) OR is_institution_admin_of(owner_institution_id))
  WITH CHECK (
    (is_institution_staff_member(owner_institution_id) OR is_institution_admin_of(owner_institution_id))
    AND (decided_by = auth.uid())
  );

DROP POLICY "Requesters cancel own pending requests" ON public.equipment_share_requests;
CREATE POLICY "Requesters cancel own pending requests" ON public.equipment_share_requests
  FOR UPDATE TO authenticated
  USING (
    (is_institution_staff_member(requester_institution_id) OR is_institution_admin_of(requester_institution_id))
    AND (status = 'pending'::text)
  )
  WITH CHECK (
    (is_institution_staff_member(requester_institution_id) OR is_institution_admin_of(requester_institution_id))
    AND (status = 'cancelled'::text)
  );

-- No DELETE policy is created: share requests are an audit trail and stay
-- undeletable by design (verified 2026-10-28: DELETE affects 0 rows).
