-- Fix block_unverified_provider() trigger — two bugs blocked all lab writes
--
-- Bug 1: role IN (...) with labels not in the app_role enum
-- (e.g. 'clinical_psychologist', 'specialist', 'medical_licentiate').
-- Postgres casts the literals to the enum at execution, so EVERY
-- insert/update on the guarded tables failed with 22P02
-- "invalid input value for enum app_role".
-- Fix: role::text IN (...) — nonexistent labels simply never match.
--
-- Bug 2: `IF TG_TABLE_NAME = 'vital_signs' AND NEW.user_id = auth.uid()`
-- referenced NEW.user_id for tables without that column (lab_tests),
-- failing at plan time with `record "new" has no field "user_id"`.
-- Fix: nest the IFs so NEW.user_id is only touched for vital_signs.
--
-- Both fixes were applied live 2026-10-05 during lab-chain QA and verified
-- end to end (doctor order → tech collect/analyze → pathologist verify).

CREATE OR REPLACE FUNCTION public.block_unverified_provider()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_has_provider_role boolean;
  v_is_verified boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role <> 'patient'
      AND role::text IN (
        'doctor','specialist','medical_licentiate','clinical_officer','dentist',
        'nurse','registered_nurse','enrolled_nurse','midwife',
        'pharmacist','pharmacy_technologist',
        'pathologist','lab_technician','phlebotomist',
        'radiologist','radiographer','physiotherapist','occupational_therapist',
        'nutritionist','optometrist','psychologist','clinical_psychologist'
      )
  ) INTO v_has_provider_role;

  IF NOT v_has_provider_role THEN
    RETURN NEW;
  END IF;

  -- Patients may record their own vitals; only touch NEW.user_id for vital_signs.
  IF TG_TABLE_NAME = 'vital_signs' THEN
    IF NEW.user_id = auth.uid() THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE((SELECT is_verified FROM public.profiles WHERE id = auth.uid()), false)
    INTO v_is_verified;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'Your provider account is pending verification. Clinical writes are disabled until approval.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.block_unverified_provider() IS
  'Blocks clinical writes by unverified providers. Fixed 2026-10-05: role::text cast (enum 22P02) and nested vital_signs user_id check.';
