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
DROP POLICY IF EXISTS "Providers with recent appointments can view medical records"
  ON public.comprehensive_medical_records;

CREATE POLICY "Providers with recent appointments can view medical records"
  ON public.comprehensive_medical_records FOR SELECT
  TO authenticated
  USING (
    auth.uid() = patient_id
    OR auth.uid() = provider_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_break_glass_access(comprehensive_medical_records.patient_id)
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = comprehensive_medical_records.patient_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('confirmed','in_progress','completed')
        AND a.date >= (CURRENT_DATE - INTERVAL '30 days')
    )
  );

-- ── 2. Emergency patient lookup ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_patient_for_emergency(p_search text)
RETURNS TABLE (patient_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_clinical boolean;
  v_term text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_term := trim(coalesce(p_search, ''));
  IF char_length(v_term) < 2 THEN
    RAISE EXCEPTION 'Enter at least 2 characters to search';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller
      AND ur.role <> 'patient'
  ) INTO v_is_clinical;
  IF NOT v_is_clinical THEN
    RAISE EXCEPTION 'Only clinical staff may search for patients';
  END IF;

  -- Identity only, never clinical data. Each returned identity is
  -- audit-logged so admins can review every emergency lookup.
  FOR patient_id, full_name IN
    SELECT p.id,
           trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
    FROM public.profiles p
    WHERE (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ILIKE '%' || v_term || '%'
    ORDER BY p.created_at DESC
    LIMIT 20
  LOOP
    INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term)
    VALUES (v_caller, patient_id, 'emergency_lookup', v_term);
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.find_patient_for_emergency(text) TO authenticated;
