-- Bed-night accumulation (CEO directive 2026-10-29): "If they charge
-- for bed care per night and a person stays there for more than one
-- night add all of them on the bill."
--
-- ORDERING (the "zz" in the filename is deliberate): this migration
-- and 20261029_till_bill_double_charge_guard.sql both CREATE OR
-- REPLACE create_hospital_bill. This one was built by patching the
-- live function AFTER the till guard had deployed, so its copy of
-- the function carries BOTH feature branches (already_paid_at_till
-- and bed_segment). It must apply AFTER the till-guard migration in
-- filename order, or a fresh replay would end with the guard's copy
-- and silently lose bed-night billing. The live database already
-- holds this exact function (verified by pg_get_functiondef).
--
-- BEFORE this migration (scripted live proof, exact figures,
-- 2026-10-29): bed charges were assembled ONLY in the browser
-- (HospitalBilling): days = max(1, ceil((now - admission_date) /
-- 86400000)) over elapsed 24-hour periods, one line per admission
-- priced at the admission's CURRENT bed, and only while the admission
-- status was still 'admitted'. The server had no night-count rule at
-- all — create_hospital_bill billed whatever quantity the client
-- sent. Proven defects:
--  B1  Interim billing froze the bed line: bill after night 2
--      (K600), then the final generation for nights 3-4 was refused
--      by the already-billed guard — the bill stayed K600 for a
--      K1,200 stay and the last two nights could never be charged.
--  B2  A ward/bed transfer mid-stay priced EVERY night at the new
--      bed's rate (the transfer only swaps hospital_admissions.
--      bed_id; no segment history exists): 2 nights general (K300)
--      + 2 nights private (K800) billed as 4 x K800 = K3,200
--      instead of K2,200 — a K1,000 overcharge.
--  B3  No server night rule: a patient admitted the same morning
--      was billed 7 nights (K2,100) because the client quantity
--      said so.
--  B4  Once the patient was discharged, the assembly's discovery
--      (status = 'admitted' only) returned nothing — bed charges
--      could only ever be raised BEFORE discharge.
--
-- Fix shape (E-14 discipline preserved — server-side pricing from
-- service_pricing, no client price channel; the append/merge/
-- insurance machinery of 20261029_billing_accumulation is reused
-- untouched):
--  * admission_bed_segments: a per-admission bed ledger, maintained
--    by a trigger on hospital_admissions so EVERY client flow
--    (admit, transfer, discharge, whichever screen does it) leaves
--    exact segments: one row per continuous stay in one bed, with
--    the bed type snapshotted at the segment's start.
--  * admission_segment_nights_due(segment): the ONE night-count
--    rule, server-side. A night is a midnight crossed between the
--    segment's start and its end (or discharge / now), in
--    Africa/Lusaka dates — the platform's operating timezone.
--    A completed stay that crossed no midnight (same-day admission
--    and discharge) still carries exactly one night, charged on
--    its final segment — the long-standing minimum the client
--    rule encoded as max(1, ...). Nights already billed on the
--    segment are subtracted: the function returns only what is
--    still owed.
--  * create_hospital_bill learns source_kind 'bed_segment': the
--    line's quantity is computed by the server from the rule above
--    (the client's quantity is ignored), the already-billed guard
--    is bypassed for this kind (a segment is SUPPOSED to appear on
--    the bill more than once, as top-up lines), and the segment's
--    nights_billed advances in the same transaction as the bill
--    write. A segment with no new nights owed is reported in
--    already_billed with a plain reason instead of being charged
--    or silently dropped.
--  * Backfill: existing admissions get their (single) segment from
--    admission_date with the current bed; nights already billed
--    under the legacy 'admission' source kind are seeded into
--    nights_billed so the top-up can never re-charge them.

-- ── The bed-segment ledger ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admission_bed_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.hospital_admissions(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bed_id uuid REFERENCES public.hospital_beds(id) ON DELETE SET NULL,
  bed_type text,
  segment_start timestamptz NOT NULL,
  segment_end timestamptz,
  nights_billed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admission_bed_segments_admission
  ON public.admission_bed_segments (admission_id);
CREATE INDEX IF NOT EXISTS idx_admission_bed_segments_patient
  ON public.admission_bed_segments (hospital_id, patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_bed_segments_open
  ON public.admission_bed_segments (admission_id) WHERE segment_end IS NULL;

ALTER TABLE public.admission_bed_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Billing team and patient read bed segments" ON public.admission_bed_segments;
CREATE POLICY "Billing team and patient read bed segments"
  ON public.admission_bed_segments
  FOR SELECT TO authenticated
  USING (
    public.is_institution_admin(hospital_id)
    OR public.is_institution_staff(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR patient_id = auth.uid()
  );

GRANT SELECT ON public.admission_bed_segments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_bed_segments TO service_role;

-- ── The one night-count rule ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admission_segment_nights_due(p_segment_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_seg public.admission_bed_segments%ROWTYPE;
  v_adm public.hospital_admissions%ROWTYPE;
  v_end timestamptz;
  v_nights integer;
BEGIN
  SELECT * INTO v_seg FROM public.admission_bed_segments WHERE id = p_segment_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  SELECT * INTO v_adm FROM public.hospital_admissions WHERE id = v_seg.admission_id;

  v_end := COALESCE(v_seg.segment_end, v_adm.discharge_date, now());

  -- A night is a midnight crossed, counted on Africa/Lusaka dates.
  v_nights := (v_end AT TIME ZONE 'Africa/Lusaka')::date
            - (v_seg.segment_start AT TIME ZONE 'Africa/Lusaka')::date;

  -- Minimum one night for a completed stay: if the whole stay
  -- crossed no midnight (same-day admission and discharge), its
  -- final segment carries exactly one night.
  IF v_adm.discharge_date IS NOT NULL AND v_nights = 0
     AND v_seg.segment_start = (SELECT max(s.segment_start)
                                FROM public.admission_bed_segments s
                                WHERE s.admission_id = v_adm.id)
     AND NOT EXISTS (
       SELECT 1 FROM public.admission_bed_segments s
       WHERE s.admission_id = v_adm.id
         AND ((COALESCE(s.segment_end, v_adm.discharge_date) AT TIME ZONE 'Africa/Lusaka')::date
              - (s.segment_start AT TIME ZONE 'Africa/Lusaka')::date) > 0
     ) THEN
    v_nights := 1;
  END IF;

  RETURN greatest(v_nights - v_seg.nights_billed, 0);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admission_segment_nights_due(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admission_segment_nights_due(uuid) TO authenticated, service_role;

-- ── Trigger: every admission write keeps the ledger exact ─────────
CREATE OR REPLACE FUNCTION public.sync_admission_bed_segment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bed_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.bed_id IS NOT NULL THEN
      SELECT bed_type INTO v_bed_type FROM public.hospital_beds WHERE id = NEW.bed_id;
      INSERT INTO public.admission_bed_segments
        (admission_id, hospital_id, patient_id, bed_id, bed_type, segment_start)
      VALUES (NEW.id, NEW.hospital_id, NEW.patient_id, NEW.bed_id, v_bed_type, NEW.admission_date);
    END IF;
    RETURN NEW;
  END IF;

  -- Transfer (or first bed assignment): close the open segment at
  -- the moment of the change, open a new one for the new bed.
  IF NEW.bed_id IS DISTINCT FROM OLD.bed_id THEN
    UPDATE public.admission_bed_segments
    SET segment_end = now(), updated_at = now()
    WHERE admission_id = NEW.id AND segment_end IS NULL;
    IF NEW.bed_id IS NOT NULL THEN
      SELECT bed_type INTO v_bed_type FROM public.hospital_beds WHERE id = NEW.bed_id;
      INSERT INTO public.admission_bed_segments
        (admission_id, hospital_id, patient_id, bed_id, bed_type, segment_start)
      VALUES (NEW.id, NEW.hospital_id, NEW.patient_id, NEW.bed_id, v_bed_type, now());
    END IF;
  END IF;

  -- Discharge closes the open segment at the discharge time.
  IF NEW.discharge_date IS NOT NULL AND OLD.discharge_date IS NULL THEN
    UPDATE public.admission_bed_segments
    SET segment_end = NEW.discharge_date, updated_at = now()
    WHERE admission_id = NEW.id AND segment_end IS NULL;
  ELSIF NEW.status = 'discharged' AND OLD.status IS DISTINCT FROM 'discharged' THEN
    UPDATE public.admission_bed_segments
    SET segment_end = COALESCE(NEW.discharge_date, now()), updated_at = now()
    WHERE admission_id = NEW.id AND segment_end IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_admission_bed_segment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_admission_bed_segment() TO service_role;

DROP TRIGGER IF EXISTS trg_sync_admission_bed_segment ON public.hospital_admissions;
CREATE TRIGGER trg_sync_admission_bed_segment
AFTER INSERT OR UPDATE OF bed_id, discharge_date, status ON public.hospital_admissions
FOR EACH ROW EXECUTE FUNCTION public.sync_admission_bed_segment();

-- ── Backfill: one segment per existing admission ──────────────────
INSERT INTO public.admission_bed_segments
  (admission_id, hospital_id, patient_id, bed_id, bed_type, segment_start, segment_end)
SELECT a.id, a.hospital_id, a.patient_id, a.bed_id, b.bed_type, a.admission_date,
       CASE WHEN a.discharge_date IS NOT NULL THEN a.discharge_date END
FROM public.hospital_admissions a
LEFT JOIN public.hospital_beds b ON b.id = a.bed_id
WHERE a.bed_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.admission_bed_segments s WHERE s.admission_id = a.id);

-- Nights already billed under the legacy 'admission' source kind
-- are credited to the segment so a top-up never re-charges them.
UPDATE public.admission_bed_segments s
SET nights_billed = (
      SELECT COALESCE(sum((it ->> 'quantity')::integer), 0)
      FROM public.hospital_billing hb,
           jsonb_array_elements(COALESCE(hb.items, '[]'::jsonb)) it
      WHERE hb.hospital_id = s.hospital_id
        AND hb.patient_id = s.patient_id
        AND it ->> 'source_kind' = 'admission'
        AND (it ->> 'source_id') ~ '^[0-9a-fA-F-]{36}$'
        AND (it ->> 'source_id')::uuid = s.admission_id
    )
WHERE EXISTS (
      SELECT 1
      FROM public.hospital_billing hb,
           jsonb_array_elements(COALESCE(hb.items, '[]'::jsonb)) it
      WHERE hb.hospital_id = s.hospital_id
        AND hb.patient_id = s.patient_id
        AND it ->> 'source_kind' = 'admission'
        AND (it ->> 'source_id') ~ '^[0-9a-fA-F-]{36}$'
        AND (it ->> 'source_id')::uuid = s.admission_id
    );

-- ── create_hospital_bill: the 'bed_segment' source kind ───────────
CREATE OR REPLACE FUNCTION public.create_hospital_bill(p_hospital_id uuid, p_patient_id uuid, p_lines jsonb, p_insurance_info_id uuid DEFAULT NULL::uuid, p_due_date date DEFAULT NULL::date)
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
  -- Bed-night top-up (2026-10-29)
  v_seg record;
  v_is_bed boolean := false;
  v_delta integer := 0;
  v_bed_before integer := 0;
  v_item jsonb;
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
    v_is_bed := false;
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
      ELSIF v_kind = 'bed_segment' THEN
        SELECT * INTO v_seg FROM public.admission_bed_segments
        WHERE id = v_ref AND patient_id = p_patient_id AND hospital_id = p_hospital_id;
        v_source_ok := FOUND;
        IF NOT v_source_ok THEN
          RAISE EXCEPTION 'That bed stay does not belong to this patient at this hospital.';
        END IF;
      ELSE
        RAISE EXCEPTION 'That charge names a record type the billing system does not recognise.';
      END IF;

      -- Bed-night top-up (2026-10-29): a bed segment is not a
      -- one-off event — the nights it owes GROW with the stay, so the
      -- already-billed guard below must not freeze it at its first
      -- quantity, and the quantity the client sent is never trusted:
      -- the server computes how many nights are still owed on this
      -- segment and bills exactly those (never more, never twice).
      IF v_kind = 'bed_segment' THEN
        v_is_bed := true;
        v_bed_before := v_seg.nights_billed;
        v_delta := public.admission_segment_nights_due(v_ref);
        IF v_delta <= 0 THEN
          SELECT invoice_number INTO v_dup_invoice
          FROM public.hospital_billing hb
          WHERE hb.hospital_id = p_hospital_id
            AND hb.patient_id = p_patient_id
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(hb.items, '[]'::jsonb)) it
              WHERE it ->> 'source_kind' = 'bed_segment'
                AND (it ->> 'source_id') ~ '^[0-9a-fA-F-]{36}$'
                AND (it ->> 'source_id')::uuid IN (
                  SELECT s2.id FROM public.admission_bed_segments s2
                  WHERE s2.admission_id = v_seg.admission_id)
            )
          LIMIT 1;
          v_already_billed := v_already_billed || jsonb_build_object(
            'source_kind', v_kind,
            'source_id', v_ref_text,
            'invoice_number', v_dup_invoice,
            'reason', 'No new bed nights to charge for this stay yet.'
          );
          CONTINUE;
        END IF;
        v_qty := v_delta;
      END IF;

      -- Already-billed guard (D2): this clinical record already sits
      -- on one of this patient's bills at this hospital — never
      -- charge it twice; report where it lives instead.
      IF NOT v_is_bed THEN
      SELECT invoice_number INTO v_dup_invoice
      FROM public.hospital_billing
      WHERE hospital_id = p_hospital_id
        AND patient_id = p_patient_id
        AND items @> jsonb_build_array(jsonb_build_object(
              'source_kind', v_kind, 'source_id', v_ref_text))
      LIMIT 1;
      END IF;
      IF NOT v_is_bed AND FOUND THEN
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
    v_item := jsonb_build_object(
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
    IF v_is_bed THEN
      -- The line carries its own audit trail: which bed, which
      -- segment of the stay, and how many of its nights were already
      -- billed before this line (top-ups stay itemised, never merged
      -- silently into a line staff can no longer reconcile).
      v_item := v_item || jsonb_build_object(
        'bed_type', v_seg.bed_type,
        'segment_start', v_seg.segment_start,
        'segment_end', v_seg.segment_end,
        'nights_billed_before', v_bed_before,
        'nights_billed_total', v_bed_before + v_qty
      );
      -- Same transaction as the bill write: if anything later in
      -- this call fails, the whole function rolls back and the
      -- nights stay unbilled.
      UPDATE public.admission_bed_segments
      SET nights_billed = nights_billed + v_qty, updated_at = now()
      WHERE id = v_ref;
    END IF;
    v_items_out := v_items_out || v_item;
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
