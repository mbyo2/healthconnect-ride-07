-- Concurrency hardening (doc swarm group 6, 2026-11-16).
--
-- FINDINGS (live-proven before this fix):
--  * kiosk_check_in idempotency was check-then-insert with no lock: two
--    kiosk terminals checking in the SAME patient at the same instant could
--    both pass the "already in today's queue" SELECT before either INSERT
--    committed, minting two tokens for one patient. A 2-way and an 8-way
--    live race both happened to serialize and returned one token — the
--    mechanism had no guarantee, only luck of timing.
--  * generate_token_number() is COUNT(*)+1 with no lock: two DIFFERENT
--    patients checking in at the same instant could compute the same count
--    and receive the SAME token number (two patients, one T-number, on the
--    public queue board).
--
-- FIX (same pattern as live enforce_provider_availability, which already
-- uses pg_advisory_xact_lock for slot serialization):
--  * kiosk_check_in takes a transaction-scoped advisory lock keyed on
--    (institution, patient) BEFORE the idempotency SELECT, so same-patient
--    check-ins serialize and the second sees the first's committed token.
--  * generate_token_number() takes a transaction-scoped advisory lock
--    keyed on (institution, date) BEFORE the COUNT, so same-day numbering
--    for one institution serializes and no two tokens share a number.
-- Advisory locks release at transaction end; each PostgREST RPC call is
-- one transaction, so the lock covers exactly check + insert.
-- No behaviour change for sequential callers; no new columns or indexes.

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

  -- Serialize same-patient check-ins (concurrency fix 2026-11-16): without
  -- this lock two terminals can both pass the idempotency SELECT below
  -- before either INSERT commits, minting two tokens for one patient.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'kiosk-checkin:' || p_institution_id::text || '|' || p_patient_id::text, 0));

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

-- Token numbering: serialize COUNT(*)+1 per institution per day so two
-- simultaneous check-ins can never receive the same token number.
CREATE OR REPLACE FUNCTION public.generate_token_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
  v_prefix TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'queue-token:' || NEW.institution_id::text || '|' || CURRENT_DATE::text, 0));

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.queue_tokens
  WHERE institution_id = NEW.institution_id
    AND created_at::date = CURRENT_DATE;

  v_prefix := CASE NEW.priority
    WHEN 'emergency' THEN 'E'
    WHEN 'urgent' THEN 'U'
    WHEN 'normal' THEN 'T'
    WHEN 'low' THEN 'L'
  END;

  NEW.token_number := v_prefix || '-' || LPAD(v_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$;
