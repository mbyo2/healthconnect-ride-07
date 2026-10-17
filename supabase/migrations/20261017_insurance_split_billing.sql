-- Smooth insurance billing: split payer amounts + auto claim linkage
--
-- Research (2026-10-17, zambia-clinical-billing-flows-research.md) found the
-- cash/insurance flow breaks at billing: HospitalBilling stored the
-- insurance *verification* id as insurance_claim_id but never created a
-- real row in insurance_claims, and the invoice carried the full amount
-- with no patient-vs-insurer split — so "patient pays X" was display-only
-- and the claim had to be re-created by hand in a separate workflow.
--
-- This migration:
-- 1. Adds patient_portion / insurer_portion / insurance_provider /
--    insurance_policy_number to hospital_billing so every invoice knows
--    exactly who owes what.
-- 2. Adds hospital_billing_id to insurance_claims so auto-created claims
--    link back to the real invoice (invoice_id references the legacy
--    billing_invoices table and stays nullable).

ALTER TABLE public.hospital_billing
  ADD COLUMN IF NOT EXISTS patient_portion numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurer_portion numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS insurance_policy_number text;

ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS hospital_billing_id uuid REFERENCES public.hospital_billing(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.hospital_billing.patient_portion IS 'Amount owed by the patient (copay / shortfall / full amount if cash).';
COMMENT ON COLUMN public.hospital_billing.insurer_portion IS 'Amount claimed from the insurer (0 for cash bills).';
