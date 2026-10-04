-- Block unverified providers from clinical writes
-- Pending (is_verified=false) providers with clinical roles should not be able
-- to write clinical data. Patients writing their own data are unaffected.
-- This extends the prescription verification fix to all clinical tables.

CREATE OR REPLACE FUNCTION public.block_unverified_provider()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_provider_role boolean;
  v_is_verified boolean;
BEGIN
  -- Check if actor has any clinical provider role (not just patient)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role <> 'patient'
    AND role IN (
      'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist',
      'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife',
      'pharmacist', 'pharmacy_technologist',
      'pathologist', 'lab_technician', 'phlebotomist', 'radiologist', 'radiographer',
      'physiotherapist', 'occupational_therapist', 'nutritionist', 'optometrist',
      'psychologist', 'clinical_psychologist'
    )
  ) INTO v_has_provider_role;

  -- If not a provider, allow (patients writing own data)
  IF NOT v_has_provider_role THEN
    RETURN NEW;
  END IF;

  -- Check if this is a personal write (about self) vs clinical write (about others)
  -- Only vital_signs commonly has personal writes; others are clinical by nature
  IF TG_TABLE_NAME = 'vital_signs' AND NEW.user_id = auth.uid() THEN
    RETURN NEW;  -- Personal health data, always allowed
  END IF;

  -- Clinical writes require verification
  SELECT COALESCE(
    (SELECT is_verified FROM public.profiles WHERE id = auth.uid()),
    false
  ) INTO v_is_verified;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'Your provider account is pending verification. Clinical writes are disabled until approval.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply to clinical tables (skip prescriptions — already covered by RLS policy)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lab_tests',
    'lab_results',
    'vital_signs',
    'referrals',
    'phq9_assessments'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_block_unverified ON public.%I',
        t
      );
      EXECUTE format(
        'CREATE TRIGGER trg_block_unverified BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_unverified_provider()',
        t
      );
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.block_unverified_provider() IS
  'Blocks clinical writes from providers whose accounts are pending verification. Patients unaffected.';
