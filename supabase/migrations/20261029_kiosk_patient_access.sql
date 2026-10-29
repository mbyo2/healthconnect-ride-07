-- Kiosk patient access (2026-10-29) — wire the Patient Self-Service Kiosk
-- to the ONE patient master (Patient Unity, 20261029_patient_unity_roster).
--
-- The kiosk page (src/pages/SelfServiceKiosk.tsx) previously performed no
-- database work at all: check-in invented a random token for any phone
-- number and walk-in registration saved nothing, so kiosk patients never
-- reached the roster or the queue and real patients were never found.
--
-- Design:
--  * The kiosk terminal runs under the institution's staff session (staff
--    launch it from the institution dashboard, same browser). Every
--    patient-touching function is gated on is_institution_member — the
--    same gate as find_or_create_patient / search_institution_patients.
--  * Lookup is by the patient's OWN phone number only: exact digit match
--    (or last-9, the find-or-create dedupe rule). NO substring search, so
--    the roster can never be enumerated from a patient-facing screen.
--    Only minimal fields leave the server (name + visit flags) — never
--    email or date of birth.
--  * Lookups are audited in patient_access_audit (access_type
--    'kiosk_lookup', search term masked to the last 4 digits).
--  * Check-in is idempotent: a patient already in today's queue gets
--    their existing token back instead of a duplicate.
--  * Scoped GRANTs in-file per the CEO-approved Oct-30 rule: authenticated
--    by default; anon receives EXECUTE only on kiosk_terminal_info, which
--    exposes nothing but the institution's public name and a boolean
--    about the CALLER (so an unactivated terminal can explain itself).
--  * Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) kiosk_terminal_info — institution display name + whether the caller
--    may operate a kiosk for it. No patient data.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kiosk_terminal_info(
  p_institution_id uuid
)
RETURNS TABLE(institution_name text, can_operate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
BEGIN
  SELECT hi.name INTO v_name
  FROM public.healthcare_institutions hi
  WHERE hi.id = p_institution_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Unknown institution';
  END IF;

  RETURN QUERY
  SELECT v_name,
         (coalesce(auth.role(), '') = 'service_role'
          OR public.is_institution_member(p_institution_id));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.kiosk_terminal_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_terminal_info(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) kiosk_lookup_patient — find THIS hospital's patient by the phone
--    number the patient types. Exact match only; minimal fields; audited.
--    Candidate universe mirrors search_institution_patients (roster union
--    established relationships at this institution).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kiosk_lookup_patient(
  p_institution_id uuid,
  p_phone text
)
RETURNS TABLE(
  patient_id uuid,
  first_name text,
  last_name text,
  has_appointment_today boolean,
  active_token_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_caller uuid := auth.uid();
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_ids uuid[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi WHERE hi.id = p_institution_id
  ) THEN
    RAISE EXCEPTION 'Unknown institution';
  END IF;

  IF NOT (coalesce(auth.role(), '') = 'service_role' OR public.is_institution_member(p_institution_id)) THEN
    RAISE EXCEPTION 'This kiosk is not active for this hospital. A staff member must open it from the hospital dashboard.';
  END IF;

  IF length(v_digits) < 9 THEN
    RAISE EXCEPTION 'Enter the full phone number used when the patient registered';
  END IF;

  WITH candidates AS (
    SELECT ip.patient_id AS pid
    FROM public.institution_patients ip
    WHERE ip.institution_id = p_institution_id AND ip.status = 'active'
    UNION
    SELECT a.patient_id
    FROM public.appointments a
    WHERE a.institution_id = p_institution_id AND a.patient_id IS NOT NULL
    UNION
    SELECT ha.patient_id
    FROM public.hospital_admissions ha
    WHERE ha.hospital_id = p_institution_id AND ha.patient_id IS NOT NULL
    UNION
    SELECT qt.patient_id
    FROM public.queue_tokens qt
    WHERE qt.institution_id = p_institution_id AND qt.patient_id IS NOT NULL
  )
  SELECT array_agg(c.pid)
  INTO v_ids
  FROM candidates c
  JOIN public.profiles p ON p.id = c.pid
  WHERE p.role = 'patient'
    AND p.phone IS NOT NULL
    AND (
      regexp_replace(p.phone, '[^0-9]', '', 'g') = v_digits
      OR (
        length(regexp_replace(p.phone, '[^0-9]', '', 'g')) >= 9
        AND right(regexp_replace(p.phone, '[^0-9]', '', 'g'), 9) = right(v_digits, 9)
      )
    );

  -- Audit the identity lookup (best effort, mirrors
  -- search_institution_patients; the search term is masked).
  IF v_caller IS NOT NULL AND v_ids IS NOT NULL THEN
    BEGIN
      INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term)
      SELECT v_caller, x.pid, 'kiosk_lookup', 'phone:****' || right(v_digits, 4)
      FROM (SELECT unnest(v_ids) AS pid LIMIT 3) x;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = p.id
        AND a.institution_id = p_institution_id
        AND a.appointment_date = CURRENT_DATE
        AND a.cancelled_at IS NULL
    ),
    (
      SELECT qt.token_number
      FROM public.queue_tokens qt
      WHERE qt.patient_id = p.id
        AND qt.institution_id = p_institution_id
        AND qt.status IN ('waiting', 'serving')
        AND qt.check_in_time::date = CURRENT_DATE
      ORDER BY qt.check_in_time DESC
      LIMIT 1
    )
  FROM public.profiles p
  WHERE p.id = ANY (coalesce(v_ids, ARRAY[]::uuid[]))
  ORDER BY p.first_name, p.last_name
  LIMIT 3;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.kiosk_lookup_patient(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kiosk_lookup_patient(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) kiosk_check_in — put a verified patient of this hospital into today's
--    queue. Idempotent per patient per day. The token number is generated
--    by the queue_tokens trigger (same T-NNN series as the queue desk) and
--    the roster auto-join trigger fires on the insert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kiosk_check_in(
  p_institution_id uuid,
  p_patient_id uuid,
  p_department text DEFAULT 'General OPD',
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  token_id uuid,
  token_number text,
  patient_name text,
  department text,
  already_checked_in boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_caller uuid := auth.uid();
  v_name text;
  v_dept text := coalesce(nullif(trim(p_department), ''), 'General OPD');
  v_token_id uuid;
  v_token_number text;
  v_token_dept text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi WHERE hi.id = p_institution_id
  ) THEN
    RAISE EXCEPTION 'Unknown institution';
  END IF;

  IF NOT public.is_institution_member(p_institution_id) THEN
    RAISE EXCEPTION 'This kiosk is not active for this hospital. A staff member must open it from the hospital dashboard.';
  END IF;

  SELECT (p.first_name || ' ' || p.last_name)
  INTO v_name
  FROM public.profiles p
  WHERE p.id = p_patient_id AND p.role = 'patient';

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Patient record not found';
  END IF;

  -- The patient must belong to this hospital: roster membership or an
  -- established relationship (booking, admission, earlier queue visit) —
  -- the same candidate universe as the lookup.
  IF NOT EXISTS (
    SELECT 1 FROM public.institution_patients ip
    WHERE ip.institution_id = p_institution_id AND ip.patient_id = p_patient_id AND ip.status = 'active'
    UNION ALL
    SELECT 1 FROM public.appointments a
    WHERE a.institution_id = p_institution_id AND a.patient_id = p_patient_id
    UNION ALL
    SELECT 1 FROM public.hospital_admissions ha
    WHERE ha.hospital_id = p_institution_id AND ha.patient_id = p_patient_id
    UNION ALL
    SELECT 1 FROM public.queue_tokens qt
    WHERE qt.institution_id = p_institution_id AND qt.patient_id = p_patient_id
  ) THEN
    RAISE EXCEPTION 'That patient is not registered at this hospital';
  END IF;

  -- Already in today's queue: hand back the same token, never a duplicate.
  SELECT qt.id, qt.token_number, qt.department
  INTO v_token_id, v_token_number, v_token_dept
  FROM public.queue_tokens qt
  WHERE qt.institution_id = p_institution_id
    AND qt.patient_id = p_patient_id
    AND qt.status IN ('waiting', 'serving')
    AND qt.check_in_time::date = CURRENT_DATE
  ORDER BY qt.check_in_time DESC
  LIMIT 1;

  IF v_token_id IS NOT NULL THEN
    RETURN QUERY SELECT v_token_id, v_token_number, v_name, v_token_dept, true;
    RETURN;
  END IF;

  INSERT INTO public.queue_tokens (
    institution_id, patient_id, token_number, patient_name,
    department, priority, status, created_by, notes
  ) VALUES (
    p_institution_id, p_patient_id, 'KIOSK', v_name,
    v_dept, 'normal', 'waiting', v_caller, p_notes
  )
  RETURNING id, queue_tokens.token_number, queue_tokens.department
  INTO v_token_id, v_token_number, v_token_dept;

  RETURN QUERY SELECT v_token_id, v_token_number, v_name, v_token_dept, false;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.kiosk_check_in(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kiosk_check_in(uuid, uuid, text, text) TO authenticated, service_role;
