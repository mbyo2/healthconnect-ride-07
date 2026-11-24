-- Swarm 2026-11-24 — patient find-or-create wiring, DB support (Order 2).
-- Findings: audit-clinical.md / audit-diagnostics.md / audit-billing.md / audit-access.md
-- in ~/workspace/doc-module-swarm-2026-11-24/.

-- PW-4: diagnostic_orders had NO insert/update policy live (SELECT only) —
-- order creation was impossible for everyone. Staff-scoped, mirroring the
-- existing SELECT policy's institution_staff pattern; an ordering provider may
-- also create orders with no institution attached (institution_id IS NULL).
CREATE POLICY "Institution staff can create diagnostic orders" ON public.diagnostic_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    (institution_id IS NULL AND ordering_provider_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.institution_staff
               WHERE institution_staff.institution_id = diagnostic_orders.institution_id
                 AND institution_staff.provider_id = auth.uid())
  );
CREATE POLICY "Institution staff can update diagnostic orders" ON public.diagnostic_orders
  FOR UPDATE TO authenticated
  USING (
    ordering_provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.institution_staff
               WHERE institution_staff.institution_id = diagnostic_orders.institution_id
                 AND institution_staff.provider_id = auth.uid())
  )
  WITH CHECK (
    ordering_provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.institution_staff
               WHERE institution_staff.institution_id = diagnostic_orders.institution_id
                 AND institution_staff.provider_id = auth.uid())
  );

-- INV-7: inventory_reconciliation(+_details) and procedure_inventory_mapping had
-- RLS on with ZERO policies — unusable by authenticated users. Staff-scoped via
-- definer helpers (no inline cross-table subqueries in the policies themselves).
CREATE OR REPLACE FUNCTION public.reconciliation_institution_id(p_reconciliation_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT institution_id FROM public.inventory_reconciliation WHERE id = p_reconciliation_id $$;
REVOKE EXECUTE ON FUNCTION public.reconciliation_institution_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconciliation_institution_id(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.medication_inventory_institution_id(p_item_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT institution_id FROM public.medication_inventory WHERE id = p_item_id $$;
REVOKE EXECUTE ON FUNCTION public.medication_inventory_institution_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.medication_inventory_institution_id(uuid) TO authenticated, service_role;

CREATE POLICY "Institution staff manage reconciliations" ON public.inventory_reconciliation
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id))
  WITH CHECK (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));
CREATE POLICY "Institution staff manage reconciliation details" ON public.inventory_reconciliation_details
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(public.reconciliation_institution_id(reconciliation_id))
         OR public.is_institution_admin(public.reconciliation_institution_id(reconciliation_id)))
  WITH CHECK (public.is_institution_staff_member(public.reconciliation_institution_id(reconciliation_id))
         OR public.is_institution_admin(public.reconciliation_institution_id(reconciliation_id)));
CREATE POLICY "Institution staff manage procedure inventory mappings" ON public.procedure_inventory_mapping
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(public.medication_inventory_institution_id(medication_inventory_id))
         OR public.is_institution_admin(public.medication_inventory_institution_id(medication_inventory_id)))
  WITH CHECK (public.is_institution_staff_member(public.medication_inventory_institution_id(medication_inventory_id))
         OR public.is_institution_admin(public.medication_inventory_institution_id(medication_inventory_id)));

-- PW-8/PW-22: institution context for prescriptions and video consultations,
-- so the roster machinery (below) and institution views can link them.
ALTER TABLE public.comprehensive_prescriptions ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.healthcare_institutions(id);
ALTER TABLE public.video_consultations ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.healthcare_institutions(id);

-- PW-14: roster source vocabulary grows to cover the new feeders.
ALTER TABLE public.institution_patients DROP CONSTRAINT IF EXISTS institution_patients_source_check;
ALTER TABLE public.institution_patients ADD CONSTRAINT institution_patients_source_check
  CHECK (source = ANY (ARRAY['registration','booking','walk_in','admission','referral','claim','queue','triage',
                             'anc','delivery','theatre','emergency','telehealth','prescription']));

-- PW-14: every institution-bearing clinical table now feeds the roster, so a
-- patient touched by any module is findable by every other module.
CREATE OR REPLACE FUNCTION public.sync_institution_patient_roster()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_institution uuid; v_source text;
BEGIN
  IF TG_TABLE_NAME = 'appointments' THEN v_institution := NEW.institution_id; v_source := 'booking';
  ELSIF TG_TABLE_NAME = 'queue_tokens' THEN v_institution := NEW.institution_id; v_source := 'queue';
  ELSIF TG_TABLE_NAME = 'hospital_admissions' THEN v_institution := NEW.hospital_id; v_source := 'admission';
  ELSIF TG_TABLE_NAME = 'referrals' THEN v_institution := NEW.hospital_id; v_source := 'referral';
  ELSIF TG_TABLE_NAME = 'anc_visits' THEN v_institution := NEW.institution_id; v_source := 'anc';
  ELSIF TG_TABLE_NAME = 'deliveries' THEN v_institution := NEW.institution_id; v_source := 'delivery';
  ELSIF TG_TABLE_NAME = 'ot_surgeries' THEN v_institution := NEW.institution_id; v_source := 'theatre';
  ELSIF TG_TABLE_NAME = 'emergency_cases' THEN v_institution := NEW.hospital_id; v_source := 'emergency';
  ELSIF TG_TABLE_NAME = 'triage_assessments' THEN v_institution := NEW.institution_id; v_source := 'triage';
  ELSIF TG_TABLE_NAME = 'video_consultations' THEN v_institution := NEW.institution_id; v_source := 'telehealth';
  ELSIF TG_TABLE_NAME = 'comprehensive_prescriptions' THEN v_institution := NEW.institution_id; v_source := 'prescription';
  ELSE RETURN NEW; END IF;
  IF v_institution IS NOT NULL AND NEW.patient_id IS NOT NULL THEN
    INSERT INTO public.institution_patients AS ip (institution_id, patient_id, source, added_by)
    VALUES (v_institution, NEW.patient_id, v_source, auth.uid())
    ON CONFLICT (institution_id, patient_id) DO UPDATE SET last_seen_at = now(), status = 'active';
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_roster_from_referral ON public.referrals;
CREATE TRIGGER trg_roster_from_referral AFTER INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();
DROP TRIGGER IF EXISTS trg_roster_from_anc_visit ON public.anc_visits;
CREATE TRIGGER trg_roster_from_anc_visit AFTER INSERT ON public.anc_visits FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();
DROP TRIGGER IF EXISTS trg_roster_from_delivery ON public.deliveries;
CREATE TRIGGER trg_roster_from_delivery AFTER INSERT ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();
DROP TRIGGER IF EXISTS trg_roster_from_ot_surgery ON public.ot_surgeries;
CREATE TRIGGER trg_roster_from_ot_surgery AFTER INSERT ON public.ot_surgeries FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();
DROP TRIGGER IF EXISTS trg_roster_from_emergency_case ON public.emergency_cases;
CREATE TRIGGER trg_roster_from_emergency_case AFTER INSERT ON public.emergency_cases FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();
DROP TRIGGER IF EXISTS trg_roster_from_triage ON public.triage_assessments;
CREATE TRIGGER trg_roster_from_triage AFTER INSERT ON public.triage_assessments FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();
DROP TRIGGER IF EXISTS trg_roster_from_video_consultation ON public.video_consultations;
CREATE TRIGGER trg_roster_from_video_consultation AFTER INSERT ON public.video_consultations FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();
DROP TRIGGER IF EXISTS trg_roster_from_prescription ON public.comprehensive_prescriptions;
CREATE TRIGGER trg_roster_from_prescription AFTER INSERT ON public.comprehensive_prescriptions FOR EACH ROW EXECUTE FUNCTION public.sync_institution_patient_roster();

-- PW-30: dead tables (0 rows live, no FK dependents, no src usage) — retired.
DROP TABLE IF EXISTS public.billing_records;
DROP TABLE IF EXISTS public.hospital_invoices;

-- PW-10: create_manual_invoice must refuse a patient-less invoice (it previously
-- validated only the free-text name). Full replacement definition, identical to
-- live except the patient_id guard after the name check. Tax still resolves
-- server-side per line via resolve_item_tax_rate; nothing client-supplied.
CREATE OR REPLACE FUNCTION public.create_manual_invoice(p_institution_id uuid, p_patient_id uuid, p_patient_name text, p_lines jsonb, p_tax numeric DEFAULT 0, p_discount numeric DEFAULT 0, p_due_date date DEFAULT NULL::date, p_notes text DEFAULT NULL::text, p_insurance_provider text DEFAULT NULL::text)
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
  v_tax numeric := 0;
  v_line_tax numeric := 0;
  v_total numeric := 0;
  v_items_out jsonb := '[]'::jsonb;
  v_invoice public.billing_invoices%ROWTYPE;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to create an invoice.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_service_role()
     AND NOT public.is_institution_admin(p_institution_id)
     AND NOT public.has_admin_scope(v_caller)
     AND NOT public.is_institution_finance_staff(p_institution_id) THEN
    RAISE EXCEPTION 'Only this institution''s billing team can create invoices here.' USING ERRCODE = '42501';
  END IF;
  IF p_patient_name IS NULL OR btrim(p_patient_name) = '' THEN
    RAISE EXCEPTION 'Choose the patient this invoice is for.';
  END IF;
  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Choose the patient this invoice is for.';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Add at least one priced service to the invoice.';
  END IF;
  IF COALESCE(p_discount, 0) < 0 THEN
    RAISE EXCEPTION 'Discount cannot be negative.';
  END IF;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    IF (v_line ->> 'service_pricing_id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_service_id := (v_line ->> 'service_pricing_id')::uuid;
    ELSE
      v_service_id := NULL;
    END IF;
    IF v_service_id IS NULL THEN
      RAISE EXCEPTION 'Every invoice line must be a priced service from the price list. Add the service and its price first, then add it to the invoice.';
    END IF;
    v_qty := COALESCE((v_line ->> 'quantity')::integer, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each service needs a quantity of at least 1.';
    END IF;
    SELECT * INTO v_pricing
    FROM public.service_pricing
    WHERE id = v_service_id
      AND is_active = true
      AND (institution_id = p_institution_id OR institution_id IS NULL);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That service is not on this institution''s price list.';
    END IF;
    v_line_total := round(v_qty * v_pricing.base_price, 2);
    -- Server-side tax: per-line rate from the item's tax template /
    -- facility default via resolve_item_tax_rate. p_tax is ignored.
    v_line_tax := round(v_line_total * public.resolve_item_tax_rate(p_institution_id, v_pricing.tax_template_id, 0), 2);
    v_tax := v_tax + v_line_tax;
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'service_pricing_id', v_pricing.id,
      'service_code', v_pricing.service_code,
      'description', v_pricing.service_label,
      'quantity', v_qty,
      'unit_price', v_pricing.base_price,
      'total', v_line_total,
      'tax', v_line_tax
    );
  END LOOP;
  IF COALESCE(p_discount, 0) > v_subtotal THEN
    RAISE EXCEPTION 'Discount cannot be more than the invoice subtotal.';
  END IF;
  v_total := v_subtotal + v_tax - COALESCE(p_discount, 0);
  INSERT INTO public.billing_invoices (
    institution_id, patient_id, invoice_number, patient_name, items,
    subtotal, tax, discount, total_amount, paid_amount, balance,
    status, due_date, notes, insurance_provider, created_by
  ) VALUES (
    p_institution_id, p_patient_id, 'TEMP', p_patient_name, v_items_out,
    v_subtotal, v_tax, COALESCE(p_discount, 0), v_total,
    0, v_total, 'draft', p_due_date, p_notes, p_insurance_provider, v_caller
  )
  RETURNING * INTO v_invoice;
  RETURN to_jsonb(v_invoice);
END;
$function$;

-- PW-15: list_patient_insurance now unions the plan-linked patient_insurance store,
-- so coverage recorded there surfaces in billing like insurance_information does.
CREATE OR REPLACE FUNCTION public.list_patient_insurance(p_hospital_id uuid, p_patient_id uuid)
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
  FROM (
    SELECT i.id, i.provider_name, i.policy_number, i.group_number,
           i.coverage_start_date, i.coverage_end_date, i.created_at
    FROM public.insurance_information i
    WHERE i.patient_id = p_patient_id
    UNION ALL
    SELECT pi.id, pl.provider_name, pi.policy_number, pi.group_number,
           pi.effective_date, pi.expiry_date, pi.created_at
    FROM public.patient_insurance pi
    JOIN public.insurance_plans pl ON pl.id = pi.plan_id
    WHERE pi.patient_id = p_patient_id
  ) i;

  RETURN v_rows;
END;
$function$;
