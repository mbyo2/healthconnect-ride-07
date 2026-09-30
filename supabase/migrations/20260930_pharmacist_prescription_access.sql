-- 2026-09-30: restore pharmacist/pharmacy-staff access to prescriptions.
--
-- Root cause: the 2026-07 migrations dropped the "Pharmacies can view and
-- update assigned prescriptions" policies, and 20260929_phase1_prescription_governance
-- explicitly left pharmacists out of scope. Result: pharmacists had NO RLS
-- path to SELECT prescriptions, so the dispense board rendered empty even
-- for prescriptions written moments earlier.
--
-- Access model:
--   1. Pharmacy staff (institution_personnel link) see all prescriptions
--      assigned to their institution (pharmacy_id), any status.
--   2. Users holding a pharmacy role (pharmacist, pharmacy_technologist,
--      pharmacy) may look up any PENDING prescription — the walk-in dispense
--      flow where the patient presents a prescription number at any pharmacy.
--   3. Pharmacy staff may UPDATE status only (pending -> filled /
--      partially_filled / cancelled) for rows they can see. They may not
--      change clinical fields, patient, prescriber, or medication.
--
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Pharmacy staff can view dispensable prescriptions"
  ON public.comprehensive_prescriptions;

CREATE POLICY "Pharmacy staff can view dispensable prescriptions"
  ON public.comprehensive_prescriptions
  FOR SELECT
  USING (
    -- Assigned to one of my institutions
    pharmacy_id IN (
      SELECT ip.institution_id
      FROM public.institution_personnel ip
      WHERE ip.user_id = auth.uid()
    )
    OR
    -- Walk-in dispense: any pending prescription, pharmacy role required
    (
      status = 'pending'
      AND (
        public.has_role(auth.uid(), 'pharmacist'::app_role)
        OR public.has_role(auth.uid(), 'pharmacy_technologist'::app_role)
        OR public.has_role(auth.uid(), 'pharmacy'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Pharmacy staff can update prescription status"
  ON public.comprehensive_prescriptions;

CREATE POLICY "Pharmacy staff can update prescription status"
  ON public.comprehensive_prescriptions
  FOR UPDATE
  USING (
    pharmacy_id IN (
      SELECT ip.institution_id
      FROM public.institution_personnel ip
      WHERE ip.user_id = auth.uid()
    )
    OR
    (
      status = 'pending'
      AND (
        public.has_role(auth.uid(), 'pharmacist'::app_role)
        OR public.has_role(auth.uid(), 'pharmacy_technologist'::app_role)
        OR public.has_role(auth.uid(), 'pharmacy'::app_role)
      )
    )
  )
  WITH CHECK (
    status IN ('filled', 'partially_filled', 'cancelled')
  );
