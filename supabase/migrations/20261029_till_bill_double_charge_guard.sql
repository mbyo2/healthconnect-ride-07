-- Till/bill double-charge guard (CEO order 2026-10-29): a medicine the
-- patient already PAID FOR at the dispensary till must never be charged
-- again on the consolidated hospital bill — and a prescription already
-- on the bill must never be charged again at the till.
--
-- Linkage map (audited live 2026-10-29 before designing):
--  * pos_sales.prescription_id and pharmacy_sales.prescription_id
--    columns exist, but NO write path ever populated them: neither
--    sale RPC accepted a prescription parameter, so a till sale could
--    not be recorded against the prescription it fulfilled. The only
--    prescription-linked record was the FEFO batch movement
--    (dispense_medicine_batches reference_type 'rx_fill') — a stock
--    event, not a payment. Reproduced live: Amoxicillin x2 paid at the
--    till (receipt RCP-20261029-0001, K180, prescription_id NULL) was
--    then billed again on INV-4F2101C680 — K360 charged for K180 of
--    medicine.
--  * The two sale tables live in different prescription universes:
--    pos_sales.prescription_id has no FK and carries
--    comprehensive_prescriptions ids (the prescriptions the hospital
--    bill charges, source_kind 'prescription');
--    pharmacy_sales.prescription_id has an FK to
--    pharmacy_prescriptions (the standalone pharmacy's own records),
--    which never reach a hospital bill. So the bill-side guard reads
--    pos_sales only, and create_pharmacy_sale's link + guard operate
--    on pharmacy_prescriptions at the till level.
--  * Legacy sales (prescription_id NULL — every sale before this
--    migration) cannot be matched to a prescription honestly:
--    pos_sales stores no patient id, only free-text name/phone, so
--    name/date fuzzy matching was rejected. The guard covers every
--    sale recorded with the link from now on.
--
-- Guard shape:
--  * prescription_till_paid(rx, hospital): how much of one
--    comprehensive prescription was already paid at that hospital's
--    till — completed pos_sales linked to the prescription, counting
--    only items whose inventory medicine name matches the
--    prescription's medicine (the same name resolution the fulfilment
--    flow uses), quantities summed so PARTIAL payments bill only the
--    unpaid remainder.
--  * create_hospital_bill: a prescription line whose quantity was
--    fully till-paid is skipped and reported in the response's
--    already_paid_at_till list (receipt numbers named); a partially
--    paid line is billed for the remainder only and reported the same
--    way. Prescription rows are locked FOR UPDATE while billing so a
--    till sale cannot race a bill generation onto the same medicine.
--  * create_pos_sale gains p_prescription_id: the sale records the
--    link (sale_type 'prescription'), and refuses — in plain language
--    naming the holder — when the prescription is already on the
--    patient's hospital bill at that hospital, or already fully paid
--    at the till. Walk-in sales (no prescription) are untouched.
--  * create_pharmacy_sale gains p_prescription_id for its own
--    pharmacy_prescriptions universe: the link is recorded and a
--    second completed linked sale for the same prescription at the
--    same pharmacy is refused, naming the first transaction. (This
--    universe is guarded at prescription level: pharmacy_prescriptions
--    carry a medications jsonb list, not per-medicine rows, so
--    per-item quantities are not well-defined there.)
-- Server-side pricing is unchanged everywhere: no price, amount or
-- total parameter is added to any function.

-- ── Till-paid lookup for one comprehensive prescription ────────────
CREATE OR REPLACE FUNCTION public.prescription_till_paid(
  p_prescription_id uuid,
  p_hospital_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_rx public.comprehensive_prescriptions%ROWTYPE;
  v_paid integer := 0;
  v_amount numeric := 0;
  v_receipts text[] := ARRAY[]::text[];
  v_row record;
BEGIN
  SELECT * INTO v_rx FROM public.comprehensive_prescriptions WHERE id = p_prescription_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('paid_quantity', 0, 'receipt_numbers', '[]'::jsonb, 'paid_amount', 0);
  END IF;

  -- The prescription's patient, this hospital's billing/pharmacy team,
  -- or a platform admin. Anyone else learns nothing.
  IF NOT public.is_service_role()
     AND v_caller IS DISTINCT FROM v_rx.patient_id
     AND NOT public.is_institution_admin(p_hospital_id)
     AND NOT public.is_institution_staff(p_hospital_id, v_caller)
     AND NOT public.is_institution_staff_member(p_hospital_id)
     AND NOT public.has_role(v_caller, 'admin'::app_role)
     AND NOT public.has_role(v_caller, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'You do not have access to this prescription''s payment record.' USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT s.receipt_number AS receipt,
           SUM(i.quantity)::integer AS qty,
           SUM(i.total) AS amt
    FROM public.pos_sales s
    JOIN public.pos_sale_items i ON i.sale_id = s.id
    JOIN public.medication_inventory mi ON mi.id = i.medication_inventory_id
    WHERE s.prescription_id = p_prescription_id
      AND s.pharmacy_id = p_hospital_id
      AND s.status = 'completed'
      AND lower(btrim(mi.medication_name)) = lower(btrim(v_rx.medication_name))
    GROUP BY s.receipt_number
  LOOP
    v_paid := v_paid + v_row.qty;
    v_amount := v_amount + COALESCE(v_row.amt, 0);
    v_receipts := array_append(v_receipts, v_row.receipt);
  END LOOP;

  RETURN jsonb_build_object(
    'paid_quantity', v_paid,
    'receipt_numbers', to_jsonb(v_receipts),
    'paid_amount', round(v_amount, 2)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.prescription_till_paid(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prescription_till_paid(uuid, uuid) TO authenticated, service_role;

-- ── create_hospital_bill: refuse / remainder-bill till-paid Rx ─────
-- Identical to 20261029_billing_accumulation except: prescription rows
-- are locked while billing, a prescription line already paid at the
-- till is skipped (fully paid) or billed for the unpaid remainder
-- only (partially paid), both reported in already_paid_at_till.
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
  -- Till/bill guard (2026-10-29)
  v_already_paid jsonb := '[]'::jsonb;
  v_till jsonb;
  v_paid_qty integer;
  v_receipt_list text;
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
        -- Till/bill guard: lock the prescription row while this bill
        -- is generated, so a till sale against the same prescription
        -- (which takes the same lock) cannot race it.
        SELECT id INTO v_ref
        FROM public.comprehensive_prescriptions
        WHERE id = v_ref
        FOR UPDATE;
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

    -- Till/bill guard: a prescription the patient already paid for at
    -- this hospital's dispensary till is never charged again. Fully
    -- paid -> skip the line and report it; partially paid -> bill
    -- only the unpaid remainder and report both quantities.
    IF v_kind = 'prescription' THEN
      v_till := public.prescription_till_paid(v_ref, p_hospital_id);
      v_paid_qty := COALESCE((v_till ->> 'paid_quantity')::integer, 0);
      IF v_paid_qty > 0 THEN
        IF v_paid_qty >= v_qty THEN
          v_already_paid := v_already_paid || jsonb_build_object(
            'source_kind', v_kind,
            'source_id', v_ref_text,
            'receipt_numbers', COALESCE(v_till -> 'receipt_numbers', '[]'::jsonb),
            'paid_quantity', v_paid_qty,
            'billed_quantity', 0
          );
          CONTINUE;
        END IF;
        v_already_paid := v_already_paid || jsonb_build_object(
          'source_kind', v_kind,
          'source_id', v_ref_text,
          'receipt_numbers', COALESCE(v_till -> 'receipt_numbers', '[]'::jsonb),
          'paid_quantity', v_paid_qty,
          'billed_quantity', v_qty - v_paid_qty
        );
        v_qty := v_qty - v_paid_qty;
      END IF;
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

  -- Nothing new to charge: hand back the bill that holds the charges
  -- when there is one, or explain plainly why there is nothing to do
  -- — never invent a duplicate and never fail silently.
  IF jsonb_array_length(v_items_out) = 0 THEN
    IF jsonb_array_length(v_already_billed) > 0 THEN
      IF v_has_open THEN
        RETURN jsonb_build_object(
          'bill', to_jsonb(v_open),
          'unpriced', v_unpriced,
          'already_billed', v_already_billed,
          'already_paid_at_till', v_already_paid,
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
          'already_paid_at_till', v_already_paid,
          'appended', false,
          'insurance_claim_id', v_bill.insurance_claim_id
        );
      END IF;
      RAISE EXCEPTION 'Those charges are already on another bill for this patient.';
    END IF;
    IF jsonb_array_length(v_already_paid) > 0 THEN
      IF v_has_open THEN
        RETURN jsonb_build_object(
          'bill', to_jsonb(v_open),
          'unpriced', v_unpriced,
          'already_billed', v_already_billed,
          'already_paid_at_till', v_already_paid,
          'appended', false,
          'insurance_claim_id', v_open.insurance_claim_id
        );
      END IF;
      SELECT string_agg(DISTINCT r, ', ') INTO v_receipt_list
      FROM jsonb_array_elements(v_already_paid) e,
           jsonb_array_elements_text(COALESCE(e -> 'receipt_numbers', '[]'::jsonb)) r;
      RAISE EXCEPTION 'Those medicines were already paid for at the dispensary till (receipt %) — there is nothing new to charge.', COALESCE(v_receipt_list, 'on record');
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
    'already_paid_at_till', v_already_paid,
    'appended', v_has_open,
    'insurance_claim_id', v_claim_id
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) TO authenticated, service_role;

-- ── create_pos_sale: record the prescription link, refuse doubles ──
-- Same body as live, plus the optional p_prescription_id (defaulted,
-- so existing callers are unaffected — the old signature is dropped
-- because Postgres would otherwise keep two callable overloads).
DROP FUNCTION IF EXISTS public.create_pos_sale(uuid, jsonb, text, text, text, text, numeric);

CREATE OR REPLACE FUNCTION public.create_pos_sale(
  p_pharmacy_id uuid,
  p_items jsonb,
  p_customer_name text DEFAULT NULL::text,
  p_customer_phone text DEFAULT NULL::text,
  p_payment_method text DEFAULT 'cash'::text,
  p_payment_reference text DEFAULT NULL::text,
  p_discount_percent numeric DEFAULT 0,
  p_prescription_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cashier uuid := auth.uid();
  v_line jsonb;
  v_item_id uuid;
  v_qty integer;
  v_inv record;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_total numeric := 0;
  v_receipt text;
  v_sale public.pos_sales%ROWTYPE;
  v_items_out jsonb := '[]'::jsonb;
  v_reserved jsonb := '{}'::jsonb;
  v_needed integer;
  -- Till/bill guard (2026-10-29)
  v_rx public.comprehensive_prescriptions%ROWTYPE;
  v_billed_invoice text;
  v_till jsonb;
  v_receipt_list text;
BEGIN
  IF v_cashier IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to record a sale.' USING ERRCODE = '42501';
  END IF;

  -- Same family of actors the old INSERT policy allowed, tightened to
  -- this institution: its staff, its admin, or a platform admin.
  IF NOT public.is_service_role()
     AND NOT public.is_institution_staff_member(p_pharmacy_id)
     AND NOT public.is_institution_admin(p_pharmacy_id)
     AND NOT public.has_role(v_cashier, 'admin'::app_role)
     AND NOT public.has_role(v_cashier, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only staff of this pharmacy can record a sale here.' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one item to the sale.';
  END IF;

  IF p_discount_percent IS NULL OR p_discount_percent < 0 OR p_discount_percent > 15 THEN
    RAISE EXCEPTION 'Discount must be from 0 to 15 percent.';
  END IF;

  IF p_payment_method NOT IN ('cash', 'mobile_money', 'card', 'insurance') THEN
    RAISE EXCEPTION 'Choose a payment method the till supports.';
  END IF;

  -- Till/bill guard: a sale against a prescription records the link
  -- and must never become the second charge for the same medicine.
  IF p_prescription_id IS NOT NULL THEN
    -- Locked: create_hospital_bill takes the same row lock while it
    -- bills, so the two charges cannot race onto the patient.
    SELECT * INTO v_rx
    FROM public.comprehensive_prescriptions
    WHERE id = p_prescription_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That prescription could not be found.';
    END IF;
    IF v_rx.pharmacy_id IS NOT NULL AND v_rx.pharmacy_id <> p_pharmacy_id THEN
      RAISE EXCEPTION 'That prescription belongs to a different pharmacy.';
    END IF;

    -- Already on the patient's hospital bill at this hospital?
    SELECT invoice_number INTO v_billed_invoice
    FROM public.hospital_billing
    WHERE hospital_id = p_pharmacy_id
      AND patient_id = v_rx.patient_id
      AND items @> jsonb_build_array(jsonb_build_object(
            'source_kind', 'prescription', 'source_id', p_prescription_id::text))
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'This prescription is already on the patient''s hospital bill (%) — it is not charged again at the till.', v_billed_invoice;
    END IF;

    -- Already fully paid at this till?
    v_till := public.prescription_till_paid(p_prescription_id, p_pharmacy_id);
    IF COALESCE((v_till ->> 'paid_quantity')::integer, 0) >= COALESCE(v_rx.quantity, 1) THEN
      SELECT string_agg(x, ', ') INTO v_receipt_list
      FROM jsonb_array_elements_text(COALESCE(v_till -> 'receipt_numbers', '[]'::jsonb)) x;
      RAISE EXCEPTION 'This prescription was already paid for at the till (receipt %) — it is not charged again.', COALESCE(v_receipt_list, 'on record');
    END IF;
  END IF;

  -- Price every line from the catalogue BEFORE writing anything.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_line ->> 'medication_inventory_id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_item_id := (v_line ->> 'medication_inventory_id')::uuid;
    ELSE
      v_item_id := NULL;
    END IF;
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'Every item on a sale must come from the dispensary price list. Add the item to inventory first, then sell it.';
    END IF;
    v_qty := COALESCE((v_line ->> 'quantity')::integer, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each item needs a quantity of at least 1.';
    END IF;

    SELECT * INTO v_inv
    FROM public.medication_inventory
    WHERE id = v_item_id AND institution_id = p_pharmacy_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That item is not on this pharmacy''s price list.';
    END IF;
    IF v_inv.unit_price IS NULL THEN
      RAISE EXCEPTION 'The item "%" has no set price yet. Ask a manager to set its price in inventory first.', v_inv.medication_name;
    END IF;
    -- Duplicate lines for one item reserve cumulatively: the stock
    -- deduction trigger only fires later, at item insert.
    v_needed := COALESCE((v_reserved ->> v_item_id::text)::integer, 0) + v_qty;
    IF v_inv.quantity_available < v_needed THEN
      RAISE EXCEPTION 'Not enough stock for "%": % available.', v_inv.medication_name, v_inv.quantity_available;
    END IF;
    v_reserved := jsonb_set(v_reserved, ARRAY[v_item_id::text], to_jsonb(v_needed));

    v_line_total := round(v_qty * v_inv.unit_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'medication_inventory_id', v_inv.id,
      'item_name', btrim(v_inv.medication_name || ' ' || COALESCE(v_inv.dosage, '')),
      'quantity', v_qty,
      'unit_price', v_inv.unit_price,
      'discount', 0,
      'total', v_line_total,
      'batch_number', v_inv.batch_number
    );
  END LOOP;

  v_discount_amount := round(v_subtotal * p_discount_percent / 100, 2);
  v_total := v_subtotal - v_discount_amount;
  v_receipt := public.generate_receipt_number(p_pharmacy_id);

  INSERT INTO public.pos_sales (
    pharmacy_id, cashier_id, customer_name, customer_phone, sale_type,
    subtotal, tax_amount, discount_amount, total_amount,
    payment_method, payment_reference, receipt_number, status,
    prescription_id
  ) VALUES (
    p_pharmacy_id, v_cashier, p_customer_name, p_customer_phone,
    CASE WHEN p_prescription_id IS NULL THEN 'walk_in' ELSE 'prescription' END,
    v_subtotal, 0, v_discount_amount, v_total,
    p_payment_method, p_payment_reference, v_receipt, 'completed',
    p_prescription_id
  )
  RETURNING * INTO v_sale;

  -- Item inserts fire pos_sale_item_deduct_inventory (quantity_available)
  -- and each line is FEFO-dispensed against the batch ledger in the
  -- same transaction — the exact pair of effects the old client flow
  -- performed non-atomically. Any failure rolls the whole sale back.
  FOR v_line IN SELECT * FROM jsonb_array_elements(v_items_out)
  LOOP
    INSERT INTO public.pos_sale_items (
      sale_id, medication_inventory_id, item_name, quantity,
      unit_price, discount, total, batch_number
    ) VALUES (
      v_sale.id,
      (v_line ->> 'medication_inventory_id')::uuid,
      v_line ->> 'item_name',
      (v_line ->> 'quantity')::integer,
      (v_line ->> 'unit_price')::numeric,
      0,
      (v_line ->> 'total')::numeric,
      v_line ->> 'batch_number'
    );

    PERFORM public.dispense_medicine_batches(
      p_pharmacy_id,
      'medication_inventory',
      (v_line ->> 'medication_inventory_id')::uuid,
      (v_line ->> 'quantity')::integer,
      'pos_sale',
      v_sale.id,
      'POS sale ' || v_receipt
    );
  END LOOP;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', v_items_out
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid, jsonb, text, text, text, text, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid, jsonb, text, text, text, text, numeric, uuid) TO authenticated, service_role;

-- ── create_pharmacy_sale: record the link in its own Rx universe ───
-- pharmacy_sales.prescription_id references pharmacy_prescriptions
-- (the standalone pharmacy's own prescription records — a different
-- universe from comprehensive_prescriptions, which never reach a
-- hospital bill). Same body as live, plus the optional
-- p_prescription_id: the link is recorded, and a second completed
-- linked sale for the same prescription at the same pharmacy is
-- refused, naming the first transaction.
DROP FUNCTION IF EXISTS public.create_pharmacy_sale(uuid, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.create_pharmacy_sale(
  p_pharmacy_id uuid,
  p_items jsonb,
  p_payment_method text DEFAULT 'cash'::text,
  p_customer_id uuid DEFAULT NULL::uuid,
  p_prescription_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_tax_rate numeric := 0.16; -- server constant: the UI's displayed Tax (16%)
  v_line jsonb;
  v_item_id uuid;
  v_qty integer;
  v_inv record;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_txn text;
  v_sale public.pharmacy_sales%ROWTYPE;
  v_items_out jsonb := '[]'::jsonb;
  v_reserved jsonb := '{}'::jsonb;
  v_needed integer;
  -- Till/bill guard (2026-10-29)
  v_prx public.pharmacy_prescriptions%ROWTYPE;
  v_dup_txn text;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to record a sale.' USING ERRCODE = '42501';
  END IF;

  -- pharmacy_inventory write-actor family, tightened to this pharmacy.
  IF NOT public.is_service_role()
     AND NOT public.is_institution_staff_member(p_pharmacy_id)
     AND NOT public.is_institution_admin(p_pharmacy_id)
     AND NOT public.has_role(v_caller, 'admin'::app_role)
     AND NOT public.has_role(v_caller, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only staff of this pharmacy can record a sale here.' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one item to the sale.';
  END IF;

  IF p_payment_method NOT IN ('cash', 'card', 'mobile_money', 'insurance', 'credit') THEN
    RAISE EXCEPTION 'Choose a payment method the till supports.';
  END IF;

  IF p_customer_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'That customer is not a registered patient.';
  END IF;

  -- Till/bill guard (pharmacy universe): record the prescription
  -- link; never let the same pharmacy prescription be paid for twice
  -- at this pharmacy's till.
  IF p_prescription_id IS NOT NULL THEN
    SELECT * INTO v_prx
    FROM public.pharmacy_prescriptions
    WHERE id = p_prescription_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That prescription could not be found.';
    END IF;
    IF v_prx.pharmacy_id IS NOT NULL AND v_prx.pharmacy_id <> p_pharmacy_id THEN
      RAISE EXCEPTION 'That prescription belongs to a different pharmacy.';
    END IF;
    IF p_customer_id IS NOT NULL AND v_prx.patient_id IS NOT NULL
       AND v_prx.patient_id <> p_customer_id THEN
      RAISE EXCEPTION 'That prescription belongs to a different customer.';
    END IF;

    SELECT transaction_id INTO v_dup_txn
    FROM public.pharmacy_sales
    WHERE prescription_id = p_prescription_id
      AND pharmacy_id = p_pharmacy_id
      AND payment_status = 'completed'
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'This prescription was already paid for at this pharmacy (transaction %) — it is not charged again.', v_dup_txn;
    END IF;
  END IF;

  -- Price every line from the selling pharmacy's catalogue BEFORE
  -- writing anything. Only the id + quantity keys are read; any
  -- price/total fields on a line are ignored.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_line ->> 'pharmacy_inventory_id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_item_id := (v_line ->> 'pharmacy_inventory_id')::uuid;
    ELSE
      v_item_id := NULL;
    END IF;
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'Every item on a sale must come from this pharmacy''s catalogue. Add the item to inventory first, then sell it.';
    END IF;
    v_qty := COALESCE((v_line ->> 'quantity')::integer, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each item needs a quantity of at least 1.';
    END IF;

    SELECT * INTO v_inv
    FROM public.pharmacy_inventory
    WHERE id = v_item_id AND pharmacy_id = p_pharmacy_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That item is not on this pharmacy''s catalogue.';
    END IF;
    IF v_inv.unit_price IS NULL THEN
      RAISE EXCEPTION 'The item "%" has no set price yet. Ask a manager to set its price in inventory first.', v_inv.product_name;
    END IF;
    -- Duplicate lines for one item reserve cumulatively: the FEFO
    -- dispense only runs after the sale row is written.
    v_needed := COALESCE((v_reserved ->> v_item_id::text)::integer, 0) + v_qty;
    IF v_inv.quantity < v_needed THEN
      RAISE EXCEPTION 'Not enough stock for "%": % available.', v_inv.product_name, v_inv.quantity;
    END IF;
    v_reserved := jsonb_set(v_reserved, ARRAY[v_item_id::text], to_jsonb(v_needed));

    v_line_total := round(v_qty * v_inv.unit_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'pharmacy_inventory_id', v_inv.id,
      'product_name', v_inv.product_name,
      'quantity', v_qty,
      'unit_price', v_inv.unit_price,
      'total', v_line_total
    );
  END LOOP;

  v_tax := round(v_subtotal * v_tax_rate, 2);
  v_total := v_subtotal + v_tax;
  v_txn := 'TXN-' || to_char(now(), 'YYYYMMDD') || '-'
           || upper(left(replace(gen_random_uuid()::text, '-', ''), 8));

  INSERT INTO public.pharmacy_sales (
    pharmacy_id, transaction_id, customer_id, items,
    subtotal, tax, tax_amount, discount, discount_amount,
    total_amount, paid_amount, balance,
    payment_method, payment_status, served_by, cashier_id,
    prescription_id
  ) VALUES (
    p_pharmacy_id, v_txn, p_customer_id, v_items_out,
    v_subtotal, v_tax, v_tax, 0, 0,
    v_total, v_total, 0,
    p_payment_method, 'completed', v_caller, v_caller,
    p_prescription_id
  )
  RETURNING * INTO v_sale;

  -- FEFO dispense against the batch ledger in the same transaction.
  -- Any shortfall raises and rolls the whole sale back — the client
  -- no longer deletes the sale row to compensate.
  FOR v_line IN SELECT * FROM jsonb_array_elements(v_items_out)
  LOOP
    PERFORM public.dispense_medicine_batches(
      p_pharmacy_id,
      'pharmacy_inventory',
      (v_line ->> 'pharmacy_inventory_id')::uuid,
      (v_line ->> 'quantity')::integer,
      'pharmacy_sale',
      v_sale.id,
      'Pharmacy sale ' || v_txn
    );
  END LOOP;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', v_items_out
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_pharmacy_sale(uuid, jsonb, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pharmacy_sale(uuid, jsonb, text, uuid, uuid) TO authenticated, service_role;
