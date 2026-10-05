-- Institution suspension (write-block / read-only)
-- When an institution is suspended, staff can still VIEW all data (patient
-- safety: critical records remain accessible), but cannot CREATE or MODIFY
-- clinical/operational records. This mirrors provider suspension semantics.
--
-- Design decision (CEO delegated 2026-10-06): write-block chosen over full
-- lockout because locking doctors out of patient records could endanger
-- patients. Reads always allowed; writes blocked with clear error.

-- 1. Suspension columns on healthcare_institutions
ALTER TABLE public.healthcare_institutions
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 2. Helper function: is this institution suspended?
CREATE OR REPLACE FUNCTION public.is_institution_suspended(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_suspended FROM public.healthcare_institutions WHERE id = p_institution_id),
    false
  );
$$;

COMMENT ON FUNCTION public.is_institution_suspended(uuid) IS
  'Returns true if the institution is suspended (write-blocked). Reads are always allowed.';

-- 3. Trigger function: block writes when the user belongs to a suspended institution
-- Checks if auth.uid() is staff/admin of any suspended institution.
-- Reads are unaffected (this is BEFORE INSERT/UPDATE/DELETE only).
CREATE OR REPLACE FUNCTION public.block_suspended_institution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_is_suspended boolean;
BEGIN
  -- Check if the acting user is affiliated with a suspended institution
  -- via institution_staff, institution_personnel, or as admin_id holder.
  SELECT EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.is_suspended = true
    AND (
      hi.admin_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.institution_staff s
        WHERE s.institution_id = hi.id AND s.provider_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.institution_personnel p
        WHERE p.institution_id = hi.id AND p.user_id = auth.uid()
      )
    )
  ) INTO v_is_suspended;

  IF v_is_suspended THEN
    RAISE EXCEPTION 'Your institution is suspended. Contact support for details.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.block_suspended_institution() IS
  'Blocks INSERT/UPDATE/DELETE on institution-scoped tables when the institution is suspended. Reads are unaffected.';

-- 4. Attach to key operational tables
-- Note: only tables with a direct institution FK. Provider suspension
-- (block_unverified_provider / is_provider_suspended) handles user-level blocks.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointments',
    'comprehensive_prescriptions',
    'lab_tests',
    'lab_results',
    'vital_signs',
    'referrals',
    'phq9_assessments',
    'billing_invoices',
    'medicine_batches',
    'medication_inventory'
  ]
  LOOP
    -- Drop if exists to avoid duplicates on re-run
    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_suspended_institution ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_block_suspended_institution BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_suspended_institution()',
      t
    );
  END LOOP;
END $$;

-- 5. Admin RPC to suspend/lift (mirrors set_provider_suspended)
CREATE OR REPLACE FUNCTION public.set_institution_suspended(
  p_institution_id uuid,
  p_suspended boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only platform admins can suspend institutions
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only platform admins can suspend institutions.'
      USING ERRCODE = '42501';
  END IF;

  IF p_suspended AND (p_reason IS NULL OR trim(p_reason) = '') THEN
    RAISE EXCEPTION 'A suspension reason is required.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.healthcare_institutions
  SET
    is_suspended = p_suspended,
    suspended_at = CASE WHEN p_suspended THEN now() ELSE NULL END,
    suspension_reason = CASE WHEN p_suspended THEN p_reason ELSE NULL END
  WHERE id = p_institution_id;
END;
$function$;

COMMENT ON FUNCTION public.set_institution_suspended(uuid, boolean, text) IS
  'Platform admin suspends/lifts an institution (write-block). Reason required to suspend.';
