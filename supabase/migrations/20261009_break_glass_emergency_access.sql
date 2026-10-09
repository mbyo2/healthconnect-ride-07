-- Break-the-glass emergency access (Epic-style)
-- Allows clinicians to override patient-access restrictions in emergencies.
-- Every break-glass event is audit-logged with a mandatory reason and auto-expires.

-- Extend patient_access_audit access_type to include break_glass events
-- (existing CHECK may not exist; add reason column for break-glass justification)
ALTER TABLE public.patient_access_audit
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid;

-- Table: active break-glass grants (one row per emergency access session)
CREATE TABLE IF NOT EXISTS public.emergency_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_access_grants ENABLE ROW LEVEL SECURITY;

-- Clinicians can view their own grants
DROP POLICY IF EXISTS "Clinicians view own emergency grants" ON public.emergency_access_grants;
CREATE POLICY "Clinicians view own emergency grants"
  ON public.emergency_access_grants FOR SELECT
  USING (auth.uid() = clinician_id);

-- Admins can view all grants
DROP POLICY IF EXISTS "Admins view all emergency grants" ON public.emergency_access_grants;
CREATE POLICY "Admins view all emergency grants"
  ON public.emergency_access_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Grants are created only via the SECURITY DEFINER function below (no direct INSERT policy)

-- Function: request break-glass emergency access
-- Returns the grant id. Logs to patient_access_audit with access_type='break_glass'.
CREATE OR REPLACE FUNCTION public.request_break_glass_access(
  p_patient_id uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_clinician uuid;
  v_grant_id uuid;
  v_is_clinical boolean;
BEGIN
  v_clinician := auth.uid();
  IF v_clinician IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Patient is required';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Emergency reason is required (minimum 10 characters)';
  END IF;

  -- Only clinical staff may break the glass
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_clinician
    AND ur.role <> 'patient'
  ) INTO v_is_clinical;

  IF NOT v_is_clinical THEN
    RAISE EXCEPTION 'Only clinical staff may request emergency access';
  END IF;

  -- Revoke any prior active grant for this clinician+patient (single active grant)
  UPDATE public.emergency_access_grants
  SET revoked_at = now(), revoked_by = v_clinician
  WHERE clinician_id = v_clinician
    AND patient_id = p_patient_id
    AND revoked_at IS NULL
    AND expires_at > now();

  INSERT INTO public.emergency_access_grants (clinician_id, patient_id, reason)
  VALUES (v_clinician, p_patient_id, trim(p_reason))
  RETURNING id INTO v_grant_id;

  -- Audit log (break_glass access type)
  INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, reason, expires_at)
  VALUES (v_clinician, p_patient_id, 'break_glass', trim(p_reason), now() + interval '4 hours');

  RETURN v_grant_id;
END;
$function$;

-- Function: check if caller holds an active break-glass grant for a patient
CREATE OR REPLACE FUNCTION public.has_break_glass_access(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.emergency_access_grants g
    WHERE g.clinician_id = auth.uid()
      AND g.patient_id = p_patient_id
      AND g.revoked_at IS NULL
      AND g.expires_at > now()
  );
$function$;

-- Function: revoke a break-glass grant (clinician revokes own; admin revokes any)
CREATE OR REPLACE FUNCTION public.revoke_break_glass_access(p_grant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_admin boolean;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller
    AND ur.role IN ('super_admin', 'admin')
  ) INTO v_is_admin;

  UPDATE public.emergency_access_grants
  SET revoked_at = now(), revoked_by = v_caller
  WHERE id = p_grant_id
    AND revoked_at IS NULL
    AND (clinician_id = v_caller OR v_is_admin);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grant not found or already revoked';
  END IF;

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.request_break_glass_access(uuid, text) IS
  'Epic-style break-the-glass: clinical staff get 4-hour emergency patient access with mandatory reason; fully audit-logged.';
