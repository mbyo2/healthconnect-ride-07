-- Stage B (Worker 1) — P1-29: atomic prescription-refill approval RPC.
--
-- LIVE-SCHEMA BASIS (verified 2026-10-24): the provider UI
-- (RefillRequestsQueue) approves rows in public.prescription_refill_requests
-- (status / provider_note / decided_at / updated_at) and then, as a second
-- client write, increments refills_remaining on the parent
-- comprehensive_prescriptions row. There are NO refills_used /
-- refills_authorized columns live, so the client's field effects are mirrored
-- exactly, but atomically and under a row lock.
--
-- Two live defects this fixes:
--   * Non-atomic two-write approval: the request could be marked approved
--     while the prescription counter update failed (or vice versa).
--   * prescription_refill_requests has RLS enabled but NO INSERT/UPDATE
--     policies at all, so the client's status UPDATE silently affected 0
--     rows — approvals never actually persisted. This SECURITY DEFINER RPC
--     performs the update regardless of the missing client policies.
--
-- Safety: the refill medication is re-screened with screen_medications
-- (stageb01) at approval time; a blocking finding refuses the approval.
-- There is no override path for refills.

CREATE OR REPLACE FUNCTION public.approve_prescription_refill(
  p_refill_id uuid,
  p_provider_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  v_caller uuid := auth.uid();
  v_req public.prescription_refill_requests%ROWTYPE;
  v_cp public.comprehensive_prescriptions%ROWTYPE;
  v_names text[];
  v_findings jsonb;
  v_blocking jsonb;
  v_new_remaining integer;
BEGIN
  -- Caller gate: an authenticated clinician in a prescribing/pharmacy role,
  -- or a service-role / direct database call (auth.uid() IS NULL).
  IF v_caller IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_caller
          AND ur.role::text IN ('doctor', 'specialist', 'medical_licentiate',
                                'clinical_officer', 'dentist', 'pharmacist')
     ) THEN
    RAISE EXCEPTION 'You do not have permission to approve prescription refills.';
  END IF;

  SELECT * INTO v_req
    FROM public.prescription_refill_requests
   WHERE id = p_refill_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refill request not found.';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'This refill request has already been processed.';
  END IF;

  SELECT * INTO v_cp
    FROM public.comprehensive_prescriptions
   WHERE id = v_req.prescription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The original prescription for this refill request could not be found.';
  END IF;

  -- Re-screen the refill medication against the patient's current allergies
  -- and active medications (excluding the parent prescription itself).
  v_names := ARRAY[v_cp.medication_name];
  IF v_cp.generic_name IS NOT NULL AND btrim(v_cp.generic_name) <> '' THEN
    v_names := array_append(v_names, v_cp.generic_name);
  END IF;

  v_findings := public.screen_medications(v_req.patient_id, v_names, v_cp.id);
  v_blocking := coalesce(v_findings -> 'blocking', '[]'::jsonb);

  IF jsonb_array_length(v_blocking) > 0 THEN
    RAISE EXCEPTION 'Refill blocked for patient safety: %. The refill was not approved — review the patient record and contact the prescriber.',
      public.summarize_safety_findings(v_blocking);
  END IF;

  -- Atomic decision + counter increment (mirrors the client's field effects).
  UPDATE public.prescription_refill_requests
     SET status = 'approved',
         provider_note = coalesce(p_provider_note, provider_note),
         decided_at = now(),
         updated_at = now()
   WHERE id = p_refill_id;

  v_new_remaining := coalesce(v_cp.refills_remaining, 0) + 1;

  UPDATE public.comprehensive_prescriptions
     SET refills_remaining = v_new_remaining,
         updated_at = now()
   WHERE id = v_cp.id;

  RETURN jsonb_build_object(
    'success', true,
    'refill_id', p_refill_id,
    'prescription_id', v_cp.id,
    'patient_id', v_req.patient_id,
    'medication_name', v_cp.medication_name,
    'refills_remaining', v_new_remaining
  );
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.approve_prescription_refill(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_prescription_refill(uuid, text) TO authenticated, service_role;
