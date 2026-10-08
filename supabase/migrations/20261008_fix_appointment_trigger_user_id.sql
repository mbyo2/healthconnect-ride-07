-- Fix set_appointment_institution_from_provider trigger: institution_staff uses
-- provider_id, not user_id. The wrong column name aborted every appointment
-- INSERT where institution_id was NULL (error 42703).
-- Found live 2026-10-08 during QAX49 lab workflow QA.

CREATE OR REPLACE FUNCTION public.set_appointment_institution_from_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_institution_id uuid;
BEGIN
  IF NEW.institution_id IS NULL AND NEW.provider_id IS NOT NULL THEN
    -- 1. Provider's own auto-provisioned practice
    SELECT id INTO v_institution_id
    FROM public.healthcare_institutions
    WHERE admin_id = NEW.provider_id
    ORDER BY created_at ASC
    LIMIT 1;

    -- 2. Fall back to staff linkage
    IF v_institution_id IS NULL THEN
      SELECT institution_id INTO v_institution_id
      FROM public.institution_staff
      WHERE provider_id = NEW.provider_id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    IF v_institution_id IS NOT NULL THEN
      NEW.institution_id := v_institution_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
