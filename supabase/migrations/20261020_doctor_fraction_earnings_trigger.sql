-- Dr. Fraction earnings calculator
-- doctor_fraction_rules + doctor_fraction_earnings existed (20261019) with a
-- rules manager and an earnings view, but NOTHING ever wrote earnings rows —
-- the view was permanently K0. This migration adds the missing writer: an
-- AFTER INSERT trigger on payment_splits.
--
-- How the money actually flows (process_payment_with_splits):
--   * The platform fee goes to an 'app_owner' split.
--   * For a payment at an institution, the 'institution' split receives
--     (total - platform fee) and any 'health_personnel' split is 0 — the
--     institution collected the money, and the doctor's fraction is their
--     contractual share OF that institution-bound amount (Danphe model).
--   * For a standalone provider payment, the 'health_personnel' split
--     receives (total - platform fee) directly.
-- So the trigger computes, per split with amount > 0:
--   gross_amount := the split amount; the earnings row's generated columns
--   derive doctor_amount / institution_amount from the matched rule's
--   doctor_percentage.
--
-- Rule matching (doctor_fraction_rules columns are institution + doctor
-- scoped, with optional procedure_category / procedure_code):
--   * Doctor: for 'institution' splits, payments.provider_id (settle.ts
--     stores the treating doctor there for appointment/booking payments;
--     institution-only payees store the institution's own id, which is
--     discarded — it is not a doctor). For 'health_personnel' splits, the
--     recipient.
--   * Institution: the split recipient for 'institution' splits; for
--     'health_personnel' splits, resolved from the payment's source the
--     same way _shared/settle.ts resolvePayee() does (appointment /
--     booking_fee -> appointments.institution_id; invoice ->
--     billing_invoices.institution_id).
--   * Category: derived from payments.metadata.reference_type
--     ('appointment'/'consultation'/'booking_fee' -> 'consultation');
--     category-specific rules beat catch-all rules, newest effective_from
--     wins. Only rules inside their effective window apply.
--
-- KNOWN LIMITATIONS (deliberate — no guessing with money):
--   * Rules with procedure_code set are NOT auto-applied: payment_splits /
--     payments carry no procedure code, so a code-scoped rule cannot be
--     matched honestly. Such earnings must be recorded manually.
--   * Invoice and pharmacy payments whose payments row names no doctor
--     produce no earnings row (no doctor attribution exists in the split
--     data). Earnings from hospital_billing line items are likewise out of
--     scope — they are not payment_splits.
--
-- Idempotency: doctor_fraction_earnings.source_split_id (added here) has a
-- unique partial index; the insert is ON CONFLICT DO NOTHING, so replays /
-- duplicate trigger paths can never double-count a split.
-- Date: 2026-10-20

ALTER TABLE public.doctor_fraction_earnings
  ADD COLUMN IF NOT EXISTS source_split_id UUID
    REFERENCES public.payment_splits(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fraction_earnings_source_split
  ON public.doctor_fraction_earnings (source_split_id)
  WHERE source_split_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_doctor_fraction_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment        public.payments%ROWTYPE;
  v_rule           public.doctor_fraction_rules%ROWTYPE;
  v_ref_type       TEXT;
  v_ref_id         UUID;
  v_institution_id UUID;
  v_doctor_id      UUID;
  v_appointment_id UUID := NULL;
  v_billing_id     UUID := NULL;
  v_category       TEXT := NULL;
  v_name           TEXT;
BEGIN
  -- Only payee splits carrying real money can hold a doctor fraction.
  IF NEW.recipient_type NOT IN ('institution', 'health_personnel') THEN
    RETURN NEW;
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = NEW.payment_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_ref_type := lower(coalesce(v_payment.metadata ->> 'reference_type', ''));
  BEGIN
    v_ref_id := (v_payment.metadata ->> 'reference_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_ref_id := NULL;
  END;

  IF NEW.recipient_type = 'institution' THEN
    v_institution_id := NEW.recipient_id;
    -- payments.provider_id is the treating doctor for appointment/booking
    -- settlements, and the institution's own id for institution-only
    -- payees (invoices, facility pharmacies) — discard the latter.
    IF v_payment.provider_id IS NOT NULL
       AND v_payment.provider_id <> NEW.recipient_id THEN
      v_doctor_id := v_payment.provider_id;
    END IF;
    IF v_ref_type = 'appointment' AND v_ref_id IS NOT NULL THEN
      v_appointment_id := v_ref_id;
    ELSIF v_ref_type = 'invoice' AND v_ref_id IS NOT NULL THEN
      v_billing_id := v_ref_id;
    ELSIF v_ref_type = 'booking_fee' AND v_ref_id IS NOT NULL THEN
      SELECT appointment_id INTO v_appointment_id
      FROM public.booking_fees WHERE id = v_ref_id;
    END IF;
  ELSE
    -- 'health_personnel' split: the recipient IS the doctor; resolve the
    -- institution the service belonged to from the payment's source.
    v_doctor_id := NEW.recipient_id;
    IF v_ref_type = 'appointment' AND v_ref_id IS NOT NULL THEN
      v_appointment_id := v_ref_id;
      SELECT institution_id INTO v_institution_id
      FROM public.appointments WHERE id = v_ref_id;
    ELSIF v_ref_type = 'booking_fee' AND v_ref_id IS NOT NULL THEN
      SELECT a.id, a.institution_id INTO v_appointment_id, v_institution_id
      FROM public.booking_fees bf
      JOIN public.appointments a ON a.id = bf.appointment_id
      WHERE bf.id = v_ref_id;
    ELSIF v_ref_type = 'invoice' AND v_ref_id IS NOT NULL THEN
      v_billing_id := v_ref_id;
      SELECT institution_id INTO v_institution_id
      FROM public.billing_invoices WHERE id = v_ref_id;
    END IF;
  END IF;

  -- Fraction rules are institution-scoped: without both parties, no row.
  IF v_institution_id IS NULL OR v_doctor_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_category := CASE
    WHEN v_ref_type IN ('appointment', 'consultation', 'booking_fee')
      THEN 'consultation'
    ELSE NULL
  END;

  SELECT * INTO v_rule
  FROM public.doctor_fraction_rules r
  WHERE r.doctor_id = v_doctor_id
    AND r.institution_id = v_institution_id
    AND r.is_active IS TRUE
    AND r.effective_from <= CURRENT_DATE
    AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
    AND r.procedure_code IS NULL
    AND (r.procedure_category IS NULL
         OR (v_category IS NOT NULL AND r.procedure_category = v_category))
  ORDER BY (r.procedure_category IS NOT NULL) DESC, r.effective_from DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_name := coalesce(
    nullif(v_payment.metadata ->> 'description', ''),
    CASE v_ref_type
      WHEN 'appointment'  THEN 'Consultation'
      WHEN 'consultation' THEN 'Video consultation'
      WHEN 'booking_fee'   THEN 'Booking fee'
      WHEN 'invoice'      THEN 'Invoice payment'
      ELSE 'Payment split'
    END
  );

  INSERT INTO public.doctor_fraction_earnings (
    institution_id, doctor_id, rule_id, billing_id, appointment_id,
    procedure_name, procedure_category, gross_amount, doctor_percentage,
    source_split_id
  ) VALUES (
    v_institution_id, v_doctor_id, v_rule.id, v_billing_id, v_appointment_id,
    v_name, coalesce(v_rule.procedure_category, v_category),
    NEW.amount, v_rule.doctor_percentage,
    NEW.id
  )
  ON CONFLICT (source_split_id) WHERE source_split_id IS NOT NULL
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_doctor_fraction_earning ON public.payment_splits;
CREATE TRIGGER trg_apply_doctor_fraction_earning
  AFTER INSERT ON public.payment_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_doctor_fraction_earning();
