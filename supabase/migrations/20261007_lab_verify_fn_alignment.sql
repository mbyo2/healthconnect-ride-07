-- Align lab verification authorization with the RLS policy
--
-- BUG (found 2026-10-07 via live lab workflow test): "Verify & Sign Off" fails
-- with "Failed to verify result" even after adding the "Lab staff can verify
-- results" RLS policy. Root cause: the BEFORE UPDATE trigger
-- trg_enforce_lab_test_verify calls user_can_verify_for_lab(), which only
-- accepts pathologist/admin roles and only checks institution_personnel —
-- the RLS policy accepts lab_technician and checks institution_staff.
-- The trigger disagrees with RLS and wins by raising an exception.
--
-- FIX: accept lab_technician in user_can_verify_for_lab and check both
-- institution_personnel and institution_staff for scope.

CREATE OR REPLACE FUNCTION public.user_can_verify_for_lab(
  p_user_id UUID,
  p_lab_institution_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  -- Super admin bypasses tenant scoping
  IF public.has_role(p_user_id, 'super_admin'::app_role) THEN
    RETURN TRUE;
  END IF;
  -- Must have a verifying role (lab_technician added 2026-10-07 to match RLS)
  IF NOT (
    public.has_role(p_user_id, 'pathologist'::app_role)
    OR public.has_role(p_user_id, 'lab_technician'::app_role)
    OR public.has_role(p_user_id, 'admin'::app_role)
  ) THEN
    RETURN FALSE;
  END IF;
  -- If no lab institution linked, allow (role check passed; legacy data)
  IF p_lab_institution_id IS NULL THEN
    RETURN TRUE;
  END IF;
  -- Must be active personnel or staff of the lab's institution
  RETURN EXISTS (
    SELECT 1 FROM public.institution_personnel
    WHERE user_id = p_user_id
      AND institution_id = p_lab_institution_id
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.institution_staff
    WHERE provider_id = p_user_id
      AND institution_id = p_lab_institution_id
      AND is_active
  );
END;
$$;

COMMENT ON FUNCTION public.user_can_verify_for_lab(uuid, uuid) IS
  'Authorizes lab result verification. Accepts pathologist, lab_technician, admin; scope via institution_personnel or institution_staff. Must stay aligned with the "Lab staff can verify results" RLS policy.';
