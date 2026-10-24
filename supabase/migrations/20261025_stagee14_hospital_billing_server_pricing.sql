-- E-14 (Stage B audit, carried from P1-26's scope): hospital billing
-- auto-assembly (HospitalBilling.tsx) computed every figure in the
-- browser — charge amounts from client tariff fallbacks (hardcoded
-- 150/200/50 defaults), the invoice total typed into an editable
-- amount field, and the insurance split from a client-estimated
-- coverage percentage (hardcoded per provider name) — and inserted
-- the result straight into hospital_billing + insurance_claims.
--
-- Fix shape (same discipline as P1-26 / C2a P2-34): all money is
-- computed server-side. Lines are priced from service_pricing (the
-- hospital's own active rows plus platform rows, prices ADD UP — CEO
-- billing rule). The insurance split is computed server-side from the
-- patient's actual insurance_information policy row and the
-- platform-held coverage terms (insurance_coverage_terms) — the
-- client passes a policy id, never a percentage. Patient share =
-- total - insurer share, floored at 0. The client sends ids,
-- quantities and clinical source references only: there is no price
-- channel and no split channel.
--
-- Unpriced lines (a price-list row whose price has not been set) do
-- NOT abort the bill and are NEVER client-priced: they are excluded
-- from the totals and REPORTED in the RPC response. A line naming a
-- service that is not on this hospital's price list at all (another
-- institution's row, or a nonexistent id) is refused, as in P1-26.
-- A line carrying a clinical source reference (procedure execution,
-- lab test, ...) is validated server-side: the source row must
-- belong to this patient at this hospital.
--
-- hospital_billing creation moves entirely behind RPCs: the FOR ALL
-- policy is replaced by SELECT/UPDATE/DELETE policies with the
-- identical predicate and NO insert policy, so direct client INSERTs
-- fail 403. The discharge draft path (dischargeWorkflow.ts) previously
-- inserted a zero draft directly — and silently failed anyway,
-- because it passed an explicit value for the GENERATED balance
-- column (428C9, swallowed as non-fatal). It now calls
-- ensure_hospital_billing_draft, which restores that flow properly.

-- ── Server-side coverage terms ──────────────────────────────────────
-- The coverage percentages the product has always estimated with
-- (NHIMA 100, Hollard Health 85, Sanlam Life Insurance 75, 80 for any
-- other accepted provider) move server-side, owned by platform
-- admins. '*' is the default row applied when a provider has no
-- specific row. This table holds terms only — which policy a patient
-- holds always comes from their insurance_information row.
CREATE TABLE IF NOT EXISTS public.insurance_coverage_terms (
  provider_name text PRIMARY KEY,
  coverage_percentage numeric NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.insurance_coverage_terms (provider_name, coverage_percentage, notes) VALUES
  ('NHIMA', 100, 'NHIMA covers 100% of tariff-allowed amounts for accredited services. Non-tariff excess is patient responsibility.'),
  ('Hollard Health', 85, 'Typical Hollard Health plan terms. Actual coverage confirmed by Hollard at time of service.'),
  ('Sanlam Life Insurance', 75, 'Typical Sanlam plan terms. Actual coverage confirmed by Sanlam at time of service.'),
  ('*', 80, 'Default terms for an accepted provider with no specific row.')
ON CONFLICT (provider_name) DO NOTHING;

ALTER TABLE public.insurance_coverage_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read coverage terms" ON public.insurance_coverage_terms;
CREATE POLICY "Signed-in users can read coverage terms"
  ON public.insurance_coverage_terms FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Platform admins manage coverage terms" ON public.insurance_coverage_terms;
CREATE POLICY "Platform admins manage coverage terms"
  ON public.insurance_coverage_terms FOR ALL TO authenticated
  USING (public.has_admin_scope(auth.uid()))
  WITH CHECK (public.has_admin_scope(auth.uid()));

-- ── Hospital bill assembly: server-priced, server-split ─────────────
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
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to create a bill.' USING ERRCODE = '42501';
  END IF;

  -- The exact actor family the old hospital_billing policy allowed:
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
  END LOOP;

  IF jsonb_array_length(v_items_out) = 0 THEN
    RAISE EXCEPTION 'None of the selected charges have a price set yet. Set their prices in the price list first, then bill again.';
  END IF;

  -- Insurance split: from the patient's actual policy row and the
  -- platform-held coverage terms. No client percentage exists.
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

    v_insurer := round(v_subtotal * v_pct / 100, 2);
    v_patient_due := greatest(round(v_subtotal - v_insurer, 2), 0);
    v_provider_name := v_policy.provider_name;
    v_policy_number := v_policy.policy_number;
    IF v_patient_due = 0 THEN
      v_status := 'paid';
    END IF;
  ELSE
    v_patient_due := v_subtotal;
  END IF;

  v_invoice_number := 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.hospital_billing (
    hospital_id, institution_id, patient_id, invoice_number, items,
    subtotal, tax, discount, total_amount, paid_amount,
    patient_portion, insurer_portion, insurance_provider,
    insurance_policy_number, payment_status, due_date
  ) VALUES (
    p_hospital_id, p_hospital_id, p_patient_id, v_invoice_number, v_items_out,
    v_subtotal, 0, 0, v_subtotal, 0,
    v_patient_due, v_insurer,
    v_provider_name,
    v_policy_number,
    v_status, COALESCE(p_due_date, current_date + 7)
  )
  RETURNING * INTO v_bill;

  -- Auto-file the insurer claim in the same transaction (the old
  -- client flow did this as a separate best-effort insert and then a
  -- second update to link it; here it cannot half-happen).
  IF v_insurer > 0 AND v_caller IS NOT NULL THEN
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

  RETURN jsonb_build_object(
    'bill', to_jsonb(v_bill),
    'unpriced', v_unpriced,
    'insurance_claim_id', v_claim_id
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_hospital_bill(uuid, uuid, jsonb, uuid, date) TO authenticated, service_role;

-- ── Patient insurance picker (staff read of policy rows) ────────────
-- insurance_information is patient-only under RLS, so billing staff
-- could never actually list a patient's policies (the old component
-- silently got zero rows). This gated read returns policy identity
-- only — coverage terms are applied inside create_hospital_bill.
CREATE OR REPLACE FUNCTION public.list_patient_insurance(
  p_hospital_id uuid,
  p_patient_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_accepted text[];
  v_rows jsonb;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to view insurance.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_service_role()
     AND NOT public.is_institution_admin(p_hospital_id)
     AND NOT public.is_institution_staff(p_hospital_id, v_caller)
     AND NOT public.has_role(v_caller, 'admin'::app_role)
     AND NOT public.has_role(v_caller, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only this hospital''s team can view a patient''s insurance here.' USING ERRCODE = '42501';
  END IF;

  SELECT accepted_insurance_providers INTO v_accepted
  FROM public.healthcare_institutions WHERE id = p_hospital_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', i.id,
           'provider_name', i.provider_name,
           'policy_number', i.policy_number,
           'group_number', i.group_number,
           'coverage_start_date', i.coverage_start_date,
           'coverage_end_date', i.coverage_end_date,
           'active_today', (i.coverage_start_date <= current_date
                            AND (i.coverage_end_date IS NULL OR i.coverage_end_date >= current_date)),
           'accepted_by_hospital', (v_accepted IS NULL OR array_length(v_accepted, 1) IS NULL
                            OR i.provider_name = ANY (v_accepted))
         ) ORDER BY i.created_at), '[]'::jsonb)
  INTO v_rows
  FROM public.insurance_information i
  WHERE i.patient_id = p_patient_id;

  RETURN v_rows;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_patient_insurance(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_patient_insurance(uuid, uuid) TO authenticated, service_role;

-- ── Discharge billing draft (zero-total, idempotent) ───────────────
CREATE OR REPLACE FUNCTION public.ensure_hospital_billing_draft(
  p_hospital_id uuid,
  p_admission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_admission record;
  v_existing uuid;
  v_bill_id uuid;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to open a billing draft.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_service_role()
     AND NOT public.is_institution_admin(p_hospital_id)
     AND NOT public.is_institution_staff(p_hospital_id, v_caller)
     AND NOT public.has_role(v_caller, 'admin'::app_role)
     AND NOT public.has_role(v_caller, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only this hospital''s team can open billing drafts here.' USING ERRCODE = '42501';
  END IF;

  SELECT id, patient_id INTO v_admission
  FROM public.hospital_admissions
  WHERE id = p_admission_id AND hospital_id = p_hospital_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That admission does not belong to this hospital.';
  END IF;

  SELECT id INTO v_existing
  FROM public.hospital_billing WHERE admission_id = p_admission_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('created', false, 'bill_id', v_existing);
  END IF;

  INSERT INTO public.hospital_billing (
    hospital_id, institution_id, patient_id, admission_id, invoice_number,
    items, subtotal, tax, discount, total_amount, paid_amount,
    patient_portion, insurer_portion, payment_status, due_date
  ) VALUES (
    p_hospital_id, p_hospital_id, v_admission.patient_id, p_admission_id,
    'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    jsonb_build_array(jsonb_build_object(
      'description', 'Bed & ward charges — complete in Billing',
      'amount', 0
    )),
    0, 0, 0, 0, 0, 0, 0, 'pending', current_date + 7
  )
  RETURNING id INTO v_bill_id;

  RETURN jsonb_build_object('created', true, 'bill_id', v_bill_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ensure_hospital_billing_draft(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_hospital_billing_draft(uuid, uuid) TO authenticated, service_role;

-- ── Lockdown: hospital_billing creation only through the RPCs ──────
-- The FOR ALL policy is replaced by per-command policies carrying the
-- IDENTICAL predicate for read/update/delete; with no INSERT policy,
-- direct client inserts fail 403 and every bill is born from
-- create_hospital_bill (priced + split server-side) or the zero-total
-- discharge draft. The patient SELECT policy is untouched.
DROP POLICY IF EXISTS "Institution admins manage hospital billing" ON public.hospital_billing;
DROP POLICY IF EXISTS "Institution staff read hospital billing" ON public.hospital_billing;
DROP POLICY IF EXISTS "Institution staff update hospital billing" ON public.hospital_billing;
DROP POLICY IF EXISTS "Institution staff delete hospital billing" ON public.hospital_billing;

CREATE POLICY "Institution staff read hospital billing"
  ON public.hospital_billing FOR SELECT TO authenticated
  USING (public.is_institution_admin(hospital_id)
         OR public.is_institution_staff(hospital_id, auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Institution staff update hospital billing"
  ON public.hospital_billing FOR UPDATE TO authenticated
  USING (public.is_institution_admin(hospital_id)
         OR public.is_institution_staff(hospital_id, auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.is_institution_admin(hospital_id)
         OR public.is_institution_staff(hospital_id, auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Institution staff delete hospital billing"
  ON public.hospital_billing FOR DELETE TO authenticated
  USING (public.is_institution_admin(hospital_id)
         OR public.is_institution_staff(hospital_id, auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'super_admin'::app_role));
