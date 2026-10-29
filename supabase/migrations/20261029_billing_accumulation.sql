-- Billing accumulation (CEO directives 2026-10-07 + 2026-10-17 +
-- 2026-10-29): a patient at an institution gets ONE consolidated bill
-- and every service they receive ADDS UP on it. The 2026-10-29 audit
-- (scripted live proof, exact figures) found the E-14 RPC priced each
-- generation correctly but broke accumulation across generations:
--
--  D1  create_hospital_bill always INSERTed a new bill. A service
--      added after the first bill existed started a SECOND bill
--      (proof: Suture Removal K150 landed on its own invoice).
--  D2  Nothing marked a clinical record as billed, so re-running
--      generation charged the same record again (proof: one patient's
--      lab test was charged twice; the patient ended with FOUR bills
--      totalling K3,040 for K2,710 of services).
--  D3  trg_appointment_complete_billing (20261018) wrote its own
--      parallel hospital_billing row the moment an appointment
--      completed — priced from profiles.consultation_fee_min with a
--      hardcoded 150.00 fallback instead of the price list, and with
--      patient_portion left at 0 — while the SAME consultation was
--      billed again inside the consolidated bill.
--  D4  The discharge draft (ensure_hospital_billing_draft) was
--      orphaned: generation created a separate bill instead of
--      completing the draft.
--
-- Fix shape (E-14 discipline preserved — server-side pricing from
-- service_pricing only, no client price/split channel, same actor
-- gate, same source validation):
--  * create_hospital_bill APPENDS to the patient's one open bill at
--    the hospital (payment_status 'pending', nothing paid yet),
--    merging lines, recomputing the total and the insurance split
--    over the merged gross, and syncing the auto-filed claim amount.
--    A bill money has been collected against is never mutated — new
--    charges then start the next bill. The discharge draft qualifies
--    as the open bill and is completed in place (its zero placeholder
--    line is dropped on merge), which closes D4.
--  * A line whose clinical source (source_kind + source_id) already
--    sits on ANY of this patient's bills at this hospital is never
--    charged twice: it is skipped and REPORTED in the response's
--    already_billed list with the invoice number holding it. The
--    same applies to a source repeated inside one call.
--  * Lab lines that land on a bill flip lab_tests.payment_status
--    'pending' -> 'billed', so the billing assemblies (which filter
--    on 'pending') stop re-offering them; the RPC dedupe above is
--    the hard guarantee behind that.
--  * The appointment-completion trigger and its function are dropped
--    (D3). Consultations still reach the one bill through the
--    assembly, matched to the price-list consultation service and
--    validated by the RPC's appointment source check.

CREATE OR REPLACE FUNCTION public.create_hospital_bill(
  p_hospital_id uuid,
  p_patient_id uuid,
  p_lines jsonb,
  p_insurance_info_id uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_line jsonb;
  v_service_id uuid;
  v_qty integer;
  v_pricing record;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_items_out jsonb := '[]'::jsonb;
  v_unpriced jsonb := '[]'::jsonb;
  v_already_billed jsonb := '[]'::jsonb;
  v_kind text;
  v_ref_text text;
  v_ref uuid;
  v_source_ok boolean;
  v_patient record;
  v_policy record;
  v_provider_name text;
  v_policy_number text;
  v_accepted text[];
  v_pct numeric;
  v_insurer numeric := 0;
  v_patient_due numeric := 0;
  v_status text := 'pending';
  v_invoice_number text;
  v_bill public.hospital_billing%ROWTYPE;
  v_claim_id uuid;
  v_patient_name text;
  -- Accumulation (2026-10-29)
  v_open public.hospital_billing%ROWTYPE;
  v_has_open boolean := false;
  v_seen_billed text[] := ARRAY[]::text[];
  v_key text;
  v_dup_invoice text;
  v_merged_items jsonb := '[]'::jsonb;
  v_merged_subtotal numeric := 0;
  v_elem jsonb;
  v_billed_labs uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to create a bill.' USING ERRCODE = '42501';
  END IF;

  -- The exact actor family the hospital_billing policy allows:
  -- the hospital's admin, its staff, or a platform admin.
  IF NOT public.is_service_role()
     AND NOT public.is_institution_admin(p_hospital_id)
     AND NOT public.is_institution_staff(p_hospital_id, v_caller)
     AND NOT public.has_role(v_caller, 'admin'::app_role)
     AND NOT public.has_role(v_caller, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only this hospital''s billing team can create bills here.' USING ERRCODE = '42501';
  END IF;

  SELECT id, first_name, last_name INTO v_patient
  FROM public.profiles WHERE id = p_patient_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That patient could not be found.';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Add at least one charge to the bill.';
  END IF;

  -- The patient's ONE open bill at this hospital: still pending and
  -- nothing collected against it yet. Locked for this transaction so
  -- two generations cannot race onto separate bills.
  SELECT * INTO v_open
  FROM public.hospital_billing
  WHERE hospital_id = p_hospital_id
    AND patient_id = p_patient_id
    AND payment_status = 'pending'
    AND paid_amount = 0
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  v_has_open := FOUND;

  v_invoice_number := 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  -- Price every line from the price list BEFORE writing anything.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    IF (v_line ->> 'service_pricing_id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_service_id := (v_line ->> 'service_pricing_id')::uuid;
    ELSE
      v_service_id := NULL;
    END IF;
    IF v_service_id IS NULL THEN
      RAISE EXCEPTION 'Every charge on a bill must be a priced service from the price list. Add the service and its price first, then bill it.';
    END IF;
    v_qty := COALESCE((v_line ->> 'quantity')::integer, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each charge needs a quantity of at least 1.';
    END IF;

    -- Clinical source validation: when a line claims to come from an
    -- encounter record, that record must be this patient's, here.
    v_kind := NULLIF(lower(btrim(COALESCE(v_line ->> 'source_kind', ''))), '');
    v_ref_text := NULLIF(btrim(COALESCE(v_line ->> 'source_id', '')), '');
    IF v_kind IS NOT NULL THEN
      IF v_ref_text IS NULL OR v_ref_text !~ '^[0-9a-fA-F-]{36}$' THEN
        RAISE EXCEPTION 'That charge is missing the record it came from.';
      END IF;
      v_ref := v_ref_text::uuid;
      v_source_ok := false;
      IF v_kind = 'procedure_execution' THEN
        SELECT EXISTS(SELECT 1 FROM public.procedure_executions
                      WHERE id = v_ref AND patient_id = p_patient_id AND institution_id = p_hospital_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That procedure was not performed for this patient at this hospital.';
        END IF;
      ELSIF v_kind = 'lab_test' THEN
        SELECT EXISTS(SELECT 1 FROM public.lab_tests
                      WHERE id = v_ref AND patient_id = p_patient_id AND institution_id = p_hospital_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That lab test does not belong to this patient at this hospital.';
        END IF;
      ELSIF v_kind = 'appointment' THEN
        SELECT EXISTS(SELECT 1 FROM public.appointments
                      WHERE id = v_ref AND patient_id = p_patient_id AND institution_id = p_hospital_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That consultation does not belong to this patient at this hospital.';
        END IF;
      ELSIF v_kind = 'imaging_order' THEN
        SELECT EXISTS(SELECT 1 FROM public.imaging_orders
                      WHERE id = v_ref AND patient_id = p_patient_id AND institution_id = p_hospital_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That imaging order does not belong to this patient at this hospital.';
        END IF;
      ELSIF v_kind = 'admission' THEN
        SELECT EXISTS(SELECT 1 FROM public.hospital_admissions
                      WHERE id = v_ref AND patient_id = p_patient_id AND hospital_id = p_hospital_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That admission does not belong to this patient at this hospital.';
        END IF;
      ELSIF v_kind = 'anc_visit' THEN
        SELECT EXISTS(SELECT 1 FROM public.anc_visits
                      WHERE id = v_ref AND patient_id = p_patient_id AND institution_id = p_hospital_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That ANC visit does not belong to this patient at this hospital.';
        END IF;
      ELSIF v_kind = 'immunization' THEN
        SELECT EXISTS(SELECT 1 FROM public.immunizations
                      WHERE id = v_ref AND patient_id = p_patient_id AND institution_id = p_hospital_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That immunization does not belong to this patient at this hospital.';
        END IF;
      ELSIF v_kind = 'prescription' THEN
        SELECT EXISTS(SELECT 1 FROM public.comprehensive_prescriptions
                      WHERE id = v_ref AND patient_id = p_patient_id) INTO v_source_ok;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That prescription does not belong to this patient.';
        END IF;
      ELSE
        RAISE EXCEPTION 'That charge names a record type the billing system does not recognise.';
      END IF;

      -- Already-billed guard (D2): this clinical record already sits
      -- on one of this patient's bills at this hospital — never
      -- charge it twice; report where it lives instead.
      SELECT invoice_number INTO v_dup_invoice
      FROM public.hospital_billing
      WHERE hospital_id = p_hospital_id
        AND patient_id = p_patient_id
        AND items @> jsonb_build_array(jsonb_build_object(
              'source_kind', v_kind, 'source_id', v_ref_text))
      LIMIT 1;
      IF FOUND THEN
        v_already_billed := v_already_billed || jsonb_build_object(
          'source_kind', v_kind,
          'source_id', v_ref_text,
          'invoice_number', v_dup_invoice
        );
        CONTINUE;
      END IF;
      v_key := v_kind || ':' || v_ref_text;
    ELSE
      v_key := NULL;
    END IF;

    SELECT * INTO v_pricing
    FROM public.service_pricing
    WHERE id = v_service_id
      AND is_active = true
      AND (institution_id = p_hospital_id OR institution_id IS NULL);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That service is not on this hospital''s price list.';
    END IF;

    -- A price-list row with no price set yet is reported back, never
    -- billed at an invented figure and never silently dropped.
    IF v_pricing.base_price IS NULL OR v_pricing.base_price <= 0 THEN
      v_unpriced := v_unpriced || jsonb_build_object(
        'service_pricing_id', v_pricing.id,
        'service_code', v_pricing.service_code,
        'description', v_pricing.service_label,
        'reason', 'No price is set for this service yet.'
      );
      CONTINUE;
    END IF;

    -- The same clinical record repeated inside this one call is
    -- billed once (the assembly can legitimately re-discover it).
    IF v_key IS NOT NULL AND v_key = ANY (v_seen_billed) THEN
      v_already_billed := v_already_billed || jsonb_build_object(
        'source_kind', v_kind,
        'source_id', v_ref_text,
        'invoice_number', COALESCE(v_open.invoice_number, v_invoice_number)
      );
      CONTINUE;
    END IF;
    IF v_key IS NOT NULL THEN
      v_seen_billed := array_append(v_seen_billed, v_key);
    END IF;

    v_line_total := round(v_qty * v_pricing.base_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'service_pricing_id', v_pricing.id,
      'service_code', v_pricing.service_code,
      'description', v_pricing.service_label,
      'category', v_pricing.category,
      'quantity', v_qty,
      'unit_price', v_pricing.base_price,
      'total', v_line_total,
      'source_kind', v_kind,
      'source_id', v_ref_text
    );
    IF v_kind = 'lab_test' THEN
      v_billed_labs := array_append(v_billed_labs, v_ref);
    END IF;
  END LOOP;

  -- Nothing new to charge: if every line was already billed, hand
  -- back the bill that holds the charges (the open one when there is
  -- one) instead of inventing a duplicate or failing the generation.
  IF jsonb_array_length(v_items_out) = 0 THEN
    IF jsonb_array_length(v_already_billed) > 0 THEN
      IF v_has_open THEN
        RETURN jsonb_build_object(
          'bill', to_jsonb(v_open),
          'unpriced', v_unpriced,
          'already_billed', v_already_billed,
          'appended', false,
          'insurance_claim_id', v_open.insurance_claim_id
        );
      END IF;
      SELECT * INTO v_bill
      FROM public.hospital_billing
      WHERE hospital_id = p_hospital_id
        AND patient_id = p_patient_id
        AND invoice_number = (v_already_billed -> 0 ->> 'invoice_number')
      LIMIT 1;
      IF FOUND THEN
        RETURN jsonb_build_object(
          'bill', to_jsonb(v_bill),
          'unpriced', v_unpriced,
          'already_billed', v_already_billed,
          'appended', false,
          'insurance_claim_id', v_bill.insurance_claim_id
        );
      END IF;
      RAISE EXCEPTION 'Those charges are already on another bill for this patient.';
    END IF;
    RAISE EXCEPTION 'None of the selected charges have a price set yet. Set their prices in the price list first, then bill again.';
  END IF;

  -- Merge onto the open bill when there is one (D1 + D4): its priced
  -- lines are kept and re-summed from their stored totals; the
  -- zero-total discharge-draft placeholder line (no price-list id,
  -- no total, no unit price) is dropped.
  IF v_has_open THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_open.items, '[]'::jsonb))
    LOOP
      IF (v_elem ? 'service_pricing_id') OR (v_elem ? 'total') OR (v_elem ? 'unit_price') THEN
        v_merged_items := v_merged_items || v_elem;
        v_merged_subtotal := v_merged_subtotal + COALESCE(
          (v_elem ->> 'total')::numeric,
          round(COALESCE((v_elem ->> 'quantity')::numeric, 1) * (v_elem ->> 'unit_price')::numeric, 2),
          (v_elem ->> 'amount')::numeric,
          0
        );
      END IF;
    END LOOP;
    v_merged_items := v_merged_items || v_items_out;
    v_merged_subtotal := v_merged_subtotal + v_subtotal;
  ELSE
    v_merged_items := v_items_out;
    v_merged_subtotal := v_subtotal;
  END IF;

  -- Insurance split over the MERGED gross: from the policy passed
  -- with this call, or — on an append — the policy already on the
  -- open bill (its provider's server-held coverage terms applied to
  -- the new total). No client percentage exists.
  IF p_insurance_info_id IS NOT NULL THEN
    SELECT * INTO v_policy
    FROM public.insurance_information WHERE id = p_insurance_info_id;
    IF NOT FOUND OR v_policy.patient_id <> p_patient_id THEN
      RAISE EXCEPTION 'That insurance policy does not belong to this patient.';
    END IF;
    IF v_policy.coverage_start_date > current_date
       OR (v_policy.coverage_end_date IS NOT NULL AND v_policy.coverage_end_date < current_date) THEN
      RAISE EXCEPTION 'That policy is not active — its coverage dates do not include today.';
    END IF;

    SELECT accepted_insurance_providers INTO v_accepted
    FROM public.healthcare_institutions WHERE id = p_hospital_id;
    IF v_accepted IS NOT NULL AND array_length(v_accepted, 1) > 0
       AND NOT (v_policy.provider_name = ANY (v_accepted)) THEN
      RAISE EXCEPTION 'This hospital does not bill % directly. Choose a policy this hospital accepts, or bill the patient directly.', v_policy.provider_name;
    END IF;

    SELECT coverage_percentage INTO v_pct
    FROM public.insurance_coverage_terms
    WHERE provider_name = v_policy.provider_name OR provider_name = '*'
    ORDER BY (provider_name = v_policy.provider_name) DESC
    LIMIT 1;
    IF v_pct IS NULL THEN
      RAISE EXCEPTION 'No coverage terms are set for % yet — a platform admin must set them before this policy can be billed.', v_policy.provider_name;
    END IF;

    v_insurer := round(v_merged_subtotal * v_pct / 100, 2);
    v_patient_due := greatest(round(v_merged_subtotal - v_insurer, 2), 0);
    v_provider_name := v_policy.provider_name;
    v_policy_number := v_policy.policy_number;
    IF v_patient_due = 0 THEN
      v_status := 'paid';
    END IF;
  ELSIF v_has_open AND v_open.insurance_provider IS NOT NULL THEN
    SELECT coverage_percentage INTO v_pct
    FROM public.insurance_coverage_terms
    WHERE provider_name = v_open.insurance_provider OR provider_name = '*'
    ORDER BY (provider_name = v_open.insurance_provider) DESC
    LIMIT 1;
    IF v_pct IS NULL THEN
      RAISE EXCEPTION 'No coverage terms are set for % yet — a platform admin must set them before this policy can be billed.', v_open.insurance_provider;
    END IF;

    v_insurer := round(v_merged_subtotal * v_pct / 100, 2);
    v_patient_due := greatest(round(v_merged_subtotal - v_insurer, 2), 0);
    v_provider_name := v_open.insurance_provider;
    v_policy_number := v_open.insurance_policy_number;
    IF v_patient_due = 0 THEN
      v_status := 'paid';
    END IF;
  ELSE
    v_patient_due := v_merged_subtotal;
  END IF;

  IF v_has_open THEN
    UPDATE public.hospital_billing
    SET items = v_merged_items,
        subtotal = v_merged_subtotal,
        total_amount = v_merged_subtotal,
        patient_portion = v_patient_due,
        insurer_portion = v_insurer,
        insurance_provider = v_provider_name,
        insurance_policy_number = v_policy_number,
        payment_status = v_status,
        due_date = COALESCE(p_due_date, v_open.due_date),
        updated_at = now()
    WHERE id = v_open.id
    RETURNING * INTO v_bill;
  ELSE
    INSERT INTO public.hospital_billing (
      hospital_id, institution_id, patient_id, invoice_number, items,
      subtotal, tax, discount, total_amount, paid_amount,
      patient_portion, insurer_portion, insurance_provider,
      insurance_policy_number, payment_status, due_date
    ) VALUES (
      p_hospital_id, p_hospital_id, p_patient_id, v_invoice_number, v_merged_items,
      v_merged_subtotal, 0, 0, v_merged_subtotal, 0,
      v_patient_due, v_insurer,
      v_provider_name,
      v_policy_number,
      v_status, COALESCE(p_due_date, current_date + 7)
    )
    RETURNING * INTO v_bill;
  END IF;

  -- Claim sync in the same transaction: an append that grows the
  -- insurer's share updates the claim filed for this bill; a first
  -- insured bill files its claim as before.
  IF v_insurer > 0 THEN
    SELECT id INTO v_claim_id
    FROM public.insurance_claims
    WHERE hospital_billing_id = v_bill.id
    ORDER BY created_at
    LIMIT 1;
    IF FOUND THEN
      UPDATE public.insurance_claims
      SET claim_amount = v_insurer
      WHERE id = v_claim_id;
      IF v_bill.insurance_claim_id IS DISTINCT FROM v_claim_id::text THEN
        UPDATE public.hospital_billing
        SET insurance_claim_id = v_claim_id::text
        WHERE id = v_bill.id;
        v_bill.insurance_claim_id := v_claim_id::text;
      END IF;
    ELSIF v_caller IS NOT NULL THEN
      v_patient_name := btrim(COALESCE(v_patient.first_name, '') || ' ' || COALESCE(v_patient.last_name, ''));
      IF v_patient_name = '' THEN
        v_patient_name := 'Patient';
      END IF;
      INSERT INTO public.insurance_claims (
        institution_id, hospital_billing_id, patient_id, patient_name,
        insurance_provider, policy_number, claim_amount, status, created_by
      ) VALUES (
        p_hospital_id, v_bill.id, p_patient_id, v_patient_name,
        v_provider_name, v_policy_number, v_insurer,
        'submitted', v_caller
      )
      RETURNING id INTO v_claim_id;

      UPDATE public.hospital_billing
      SET insurance_claim_id = v_claim_id::text
      WHERE id = v_bill.id
      RETURNING * INTO v_bill;
    END IF;
  END IF;

  -- Billed labs leave the 'pending' pool so the assemblies stop
  -- re-offering them (the already-billed guard above stays the hard
  -- guarantee even if this flag is ever reset by hand).
  IF array_length(v_billed_labs, 1) > 0 THEN
    UPDATE public.lab_tests
    SET payment_status = 'billed'
    WHERE id = ANY (v_billed_labs)
      AND payment_status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'bill', to_jsonb(v_bill),
    'unpriced', v_unpriced,
    'already_billed', v_already_billed,
    'appended', v_has_open,
    'insurance_claim_id', v_claim_id
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) TO authenticated, service_role;

-- ── D3: the parallel consultation bill goes away ────────────────────
-- Completing an appointment must not spawn a separate bill. The
-- consultation reaches the patient's ONE bill through the billing
-- assembly (completed appointments matched to the price-list
-- consultation service, source-validated by the RPC above).
DROP TRIGGER IF EXISTS trg_appointment_complete_billing ON public.appointments;
DROP FUNCTION IF EXISTS public.create_billing_on_appointment_complete();
