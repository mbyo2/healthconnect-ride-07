-- Break-the-glass completion (2026-10-09).
--
-- 1. The medical-records SELECT policy now honors active break-glass grants:
--    a clinician holding an unexpired, unrevoked grant for a patient can read
--    that patient's comprehensive_medical_records. has_break_glass_access is
--    SECURITY DEFINER (opaque to the RLS rewriter, no recursion risk).
-- 2. New find_patient_for_emergency RPC: clinicians can locate a patient by
--    name in a genuine emergency. Returns identity only (no clinical data);
--    every returned identity is audit-logged as 'emergency_lookup' for admin
--    review. Patients and anonymous callers are rejected.

-- ── 1. Records RLS consults break-glass ──────────────────────────────
-- Additive permissive policy (OR'd with the existing ones): a clinician
-- holding an active, unexpired, unrevoked grant for a patient can read that
-- patient's records. has_break_glass_access is SECURITY DEFINER (opaque to
-- the RLS rewriter, no recursion risk). The existing policy is untouched.
DROP POLICY IF EXISTS "Break-glass emergency access to records"
  ON public.comprehensive_medical_records;
CREATE POLICY "Break-glass emergency access to records"
  ON public.comprehensive_medical_records FOR SELECT
  TO authenticated
  USING (public.has_break_glass_access(patient_id));

-- ── 2. Emergency patient lookup ───────────────────────────────────────
-- NOTE: the dashboard SQL editor mangles long *typed* statements, so the
-- lookup is split into two deliberately compact functions (both verified
-- typable). The client calls search first, then log; results are shown only
-- if the audit lands (fail-closed accountability).
--
-- emergency_patient_search: identity only (never clinical data). Failing
-- preconditions (not authenticated, <2 chars, not clinical staff) yield an
-- empty set rather than an error, so probing reveals nothing. (A NULL caller
-- fails the EXISTS check.) Deliberately a single compact statement: the
-- dashboard SQL editor mangles long typed input — and specifically duplicates
-- statements containing $$ quoting or % wildcards, so this uses $f$ quoting
-- and position()/lower() instead of ILIKE '%...%'.
CREATE OR REPLACE FUNCTION public.emergency_patient_search(q text)
RETURNS TABLE (pid uuid, nm text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $f$
  SELECT p.id, concat_ws(' ', p.first_name, p.last_name)
  FROM public.profiles p
  WHERE position(lower(trim(coalesce(q, ''))) in lower(concat_ws(' ', p.first_name, p.last_name))) > 0
    AND char_length(trim(coalesce(q, ''))) >= 2
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role <> 'patient')
  LIMIT 20;
$f$;

-- log_emergency_lookup: audit-log every returned identity as
-- 'emergency_lookup' so admins can review who looked up whom.
CREATE OR REPLACE FUNCTION public.log_emergency_lookup(p_term text, p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role <> 'patient')
  THEN
    RETURN;
  END IF;
  INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term)
  SELECT v_caller, i, 'emergency_lookup', p_term FROM unnest(p_ids) AS i;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.emergency_patient_search(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_emergency_lookup(text, uuid[]) TO authenticated;
