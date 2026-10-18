-- InsuranceClaimWorkflow inserts columns that were never added to insurance_claims.
-- Without these, claim creation fails with "column does not exist".
-- Adds the workflow's expected columns; existing rows get NULL/defaults.

ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS claim_number TEXT,
  ADD COLUMN IF NOT EXISTS claim_type TEXT,
  ADD COLUMN IF NOT EXISTS claimed_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS diagnosis_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS procedure_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill claim_number for rows created before this column existed
UPDATE public.insurance_claims
SET claim_number = 'CLM-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substring(id::text, 1, 6))
WHERE claim_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_claims_number ON public.insurance_claims(claim_number);
