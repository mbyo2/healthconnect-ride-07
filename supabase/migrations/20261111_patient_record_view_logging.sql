-- Patient-record VIEW logging (CEO no-lawsuits bar, 2026-11-11).
--
-- The audit-trail verification of 2026-11-11 found that patient searches
-- are written to public.patient_access_audit by the search RPCs
-- (search_patients_for_provider, search_institution_patients,
-- log_emergency_lookup, request_break_glass_access), but OPENING/VIEWING
-- a patient's record, prescriptions or lab results was logged NOWHERE.
-- This migration adds the server-side writer for view events.
--
-- Vocabulary (extends the existing access_type values 'search',
-- 'emergency_lookup', 'break_glass' — the column carries no CHECK):
--   'view'      — an authenticated user opened another patient's record
--                 surface; search_term carries the surface.
--   'self_view' — a patient opened their OWN record surface. Recorded
--                 distinctly so third-party access reviews can filter
--                 self-views out instead of drowning in them.
-- Surfaces (search_term): 'medical_records' | 'prescriptions' |
-- 'lab_results'; anything else is bucketed to 'other' so unvalidated
-- free text never lands in the audit trail.
--
-- Gating mirrors the search RPCs: they gate the DATA they return, never
-- the audit write itself (search_patients_for_provider logs every match
-- before its relationship filter). This writer therefore does not
-- require a care relationship either — its job is the trail, not a new
-- permission. The only sanity checks: caller authenticated, target is
-- an existing patient profile. A failed write can never break the
-- caller (best-effort insert, mirroring the search RPCs, plus the
-- client calls this fire-and-forget).

CREATE OR REPLACE FUNCTION public.log_patient_record_access(
  p_patient_id uuid,
  p_surface text,
  p_context jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_surface text;
  v_access_type text;
BEGIN
  IF v_caller IS NULL OR p_patient_id IS NULL THEN
    RETURN;
  END IF;

  -- Only real patient profiles can be audit targets; anything else is a
  -- client bug or probing, and silently logging it would pollute the
  -- trail with rows admins cannot interpret.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_patient_id AND p.role = 'patient'
  ) THEN
    RETURN;
  END IF;

  v_surface := CASE
    WHEN p_surface IN ('medical_records', 'prescriptions', 'lab_results')
      THEN p_surface
    ELSE 'other'
  END;

  v_access_type := CASE
    WHEN v_caller = p_patient_id THEN 'self_view'
    ELSE 'view'
  END;

  BEGIN
    INSERT INTO public.patient_access_audit
      (accessor_id, patient_id, access_type, search_term, reason)
    VALUES
      (v_caller, p_patient_id, v_access_type, v_surface,
       CASE WHEN p_context IS NULL THEN NULL
            ELSE left(p_context::text, 1000) END);
  EXCEPTION WHEN OTHERS THEN
    -- Best effort, exactly like the search RPCs: an audit failure must
    -- never surface in the clinical read path.
    NULL;
  END;
END;
$function$;

COMMENT ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) IS
  'Fire-and-forget patient-record view logger. Writes patient_access_audit rows with access_type view/self_view and the surface in search_term. Called by the client when a user opens a patient record, prescription list or lab results. Best-effort: never raises to the caller.';

-- Fresh functions inherit EXECUTE for PUBLIC on Supabase; pin the ACL to
-- the same shape as the other patient_access_audit writers
-- (postgres + authenticated + service_role), never anon/PUBLIC.
REVOKE ALL ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_patient_record_access(uuid, text, jsonb) TO service_role;
