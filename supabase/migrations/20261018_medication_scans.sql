-- 2026-10-18: Barcode Medication Verification (FEATURE 2 — Epic-competitive scan-to-verify).
--
-- medication_scans: immutable audit log of every scan-to-verify event at
-- dispensing / administration. EVERY scan is logged, match or mismatch.
-- Mismatches can only be resolved by a typed pharmacist override
-- (override_reason), which is recorded on the same row.
--
-- Also adds public.comprehensive_prescriptions.barcode so the scan loop is
-- complete: the prescription label prints the barcode value, and the verify
-- screen compares the scanned package barcode against it (falling back to
-- prescription_number when barcode is not set).
--
-- RLS: institution staff can INSERT scans for their institution and READ
-- their institution's scans. Cross-table checks go through the opaque
-- SECURITY DEFINER helper (no inline RLS subqueries — avoids the
-- profiles-policy recursion class of failure documented 2026-09-30).

-- ---------------------------------------------------------------------------
-- Prescription barcode column (expected barcode for scan-to-verify)
-- ---------------------------------------------------------------------------
ALTER TABLE public.comprehensive_prescriptions
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- ---------------------------------------------------------------------------
-- medication_scans audit table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  prescription_id UUID,
  medication_name TEXT NOT NULL,
  barcode_scanned TEXT NOT NULL,
  expected_barcode TEXT,
  verification_result TEXT NOT NULL CHECK (verification_result IN ('match', 'mismatch')),
  scanned_by UUID REFERENCES auth.users(id),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT,
  override_reason TEXT,
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE
);

-- Fast lookups: scan history per prescription, newest first
CREATE INDEX IF NOT EXISTS idx_medication_scans_prescription
  ON public.medication_scans (prescription_id, scanned_at DESC);
-- Institution dashboards: recent scans per institution
CREATE INDEX IF NOT EXISTS idx_medication_scans_institution
  ON public.medication_scans (institution_id, scanned_at DESC);

ALTER TABLE public.medication_scans ENABLE ROW LEVEL SECURITY;

-- Staff log a scan for their own institution
DROP POLICY IF EXISTS "Staff can log medication scans" ON public.medication_scans;
CREATE POLICY "Staff can log medication scans"
  ON public.medication_scans
  FOR INSERT
  WITH CHECK (
    institution_id IS NOT NULL
    AND public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  );

-- Staff read their own institution's scans
DROP POLICY IF EXISTS "Staff read own institution medication scans" ON public.medication_scans;
CREATE POLICY "Staff read own institution medication scans"
  ON public.medication_scans
  FOR SELECT
  USING (
    institution_id IS NOT NULL
    AND public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  );

-- Pharmacist override: only the override_reason may be set, only once,
-- and only on a mismatch row — the audit record itself stays immutable.
DROP POLICY IF EXISTS "Staff record mismatch override" ON public.medication_scans;
CREATE POLICY "Staff record mismatch override"
  ON public.medication_scans
  FOR UPDATE
  USING (
    institution_id IS NOT NULL
    AND verification_result = 'mismatch'
    AND override_reason IS NULL
    AND public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  )
  WITH CHECK (
    verification_result = 'mismatch'
    AND override_reason IS NOT NULL
  );

-- No DELETE: scans are a permanent safety audit trail.
