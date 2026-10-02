-- Harden lab verification: prevent re-verification and enforce tenant scoping.
--
-- The "Lab staff can manage lab tests" ALL policy allows any pathologist to
-- UPDATE any lab test, including re-verifying already-verified results and
-- verifying results from other institutions' labs. These triggers enforce:
--
-- 1. No re-verification: once verified_at is set, it cannot be changed.
--    Corrections require a proper amendment workflow, not silent overwrite.
--
-- 2. Tenant scoping: the verifying user must belong (via
--    institution_personnel, status='active') to the institution that owns
--    the lab (lab_tests.lab_id). Super admins bypass tenant scoping.
--
-- Applied to both lab_tests (source of truth) and lab_results (mirror).
-- Uses SECURITY DEFINER functions to avoid RLS recursion.

-- Helper: check if user can verify for a given lab institution
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
  -- Must have a verifying role
  IF NOT (
    public.has_role(p_user_id, 'pathologist'::app_role)
    OR public.has_role(p_user_id, 'admin'::app_role)
  ) THEN
    RETURN FALSE;
  END IF;
  -- If no lab institution linked, allow (role check passed; legacy data)
  IF p_lab_institution_id IS NULL THEN
    RETURN TRUE;
  END IF;
  -- Must be active personnel of the lab's institution
  RETURN EXISTS (
    SELECT 1 FROM public.institution_personnel
    WHERE user_id = p_user_id
      AND institution_id = p_lab_institution_id
      AND status = 'active'
  );
END;
$$;

-- Trigger function for lab_tests
CREATE OR REPLACE FUNCTION public.enforce_lab_test_verify_rules()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only enforce when verification fields are being set/changed
  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
    -- Rule 1: no re-verification
    IF OLD.verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'Lab test % is already verified; re-verification is not allowed', OLD.id;
    END IF;
    -- Rule 2: tenant scoping
    IF NOT public.user_can_verify_for_lab(auth.uid(), NEW.lab_id) THEN
      RAISE EXCEPTION 'Not authorized to verify lab tests for this institution';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lab_test_verify ON public.lab_tests;
CREATE TRIGGER trg_enforce_lab_test_verify
  BEFORE UPDATE ON public.lab_tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lab_test_verify_rules();

-- Trigger function for lab_results (mirror table)
CREATE OR REPLACE FUNCTION public.enforce_lab_result_verify_rules()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lab_id UUID;
BEGIN
  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    -- Rule 1: no re-verification
    IF OLD.verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'Lab result % is already verified; re-verification is not allowed', OLD.id;
    END IF;
    -- Rule 2: tenant scoping via test_id -> lab_tests -> lab_id
    SELECT lt.lab_id INTO v_lab_id
    FROM public.lab_tests lt
    WHERE lt.id = NEW.test_id;
    IF NOT public.user_can_verify_for_lab(auth.uid(), v_lab_id) THEN
      RAISE EXCEPTION 'Not authorized to verify lab results for this institution';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lab_result_verify ON public.lab_results;
CREATE TRIGGER trg_enforce_lab_result_verify
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lab_result_verify_rules();
