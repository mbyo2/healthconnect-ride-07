-- Provider suspension for Terms & Conditions violations
-- Adds user-level suspension with RLS enforcement on clinical writes.
-- A suspended provider can still sign in (to see the notice) but cannot
-- perform any clinical actions.

-- 1. Suspension columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 2. Helper: is this user suspended? (SECURITY DEFINER so RLS policies can call it)
CREATE OR REPLACE FUNCTION public.is_provider_suspended(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_suspended FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

-- 3. Admin-only suspend/unsuspend function
CREATE OR REPLACE FUNCTION public.set_provider_suspended(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Only platform admins/superadmins or institution admins can suspend
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'institution_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can suspend providers';
  END IF;

  UPDATE public.profiles
  SET is_suspended = p_suspended,
      suspended_at = CASE WHEN p_suspended THEN now() ELSE NULL END,
      suspension_reason = CASE WHEN p_suspended THEN p_reason ELSE NULL END,
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider profile not found';
  END IF;
END;
$$;

-- 4. Block suspended providers from prescribing
-- (extends the existing verified-prescriber check)
CREATE OR REPLACE FUNCTION public.is_verified_prescriber(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT is_verified FROM public.profiles WHERE id = p_user_id), false)
    AND NOT public.is_provider_suspended(p_user_id);
$$;

-- 5. Trigger-based enforcement: block ALL clinical writes from suspended users.
-- This is safer than rewriting dozens of RLS policies: a BEFORE INSERT OR UPDATE
-- trigger on each clinical table raises an exception if the actor is suspended.
CREATE OR REPLACE FUNCTION public.block_suspended_provider()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_provider_suspended(auth.uid()) THEN
    RAISE EXCEPTION 'Your provider account is suspended. Contact support for details.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to clinical write tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'comprehensive_prescriptions',
    'lab_tests',
    'lab_results',
    'vital_signs',
    'consultation_notes',
    'diagnoses',
    'referrals',
    'medication_administrations',
    'phq9_assessments'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_block_suspended ON public.%I',
        t
      );
      EXECUTE format(
        'CREATE TRIGGER trg_block_suspended BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_suspended_provider()',
        t
      );
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist yet; skip
      NULL;
    END;
  END LOOP;
END $$;

-- 6. Allow admins to view suspension status (profiles SELECT already covers this
-- via existing policies; no change needed)

COMMENT ON COLUMN public.profiles.is_suspended IS 'True if provider is suspended for Terms & Conditions violations';
COMMENT ON FUNCTION public.set_provider_suspended IS 'Admin-only: suspend/unsuspend a provider with a reason';
