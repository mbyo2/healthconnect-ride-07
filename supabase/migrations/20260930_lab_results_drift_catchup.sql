-- ============================================================
-- Doc'O Clock — lab_results drift catch-up (2026-09-30)
--
-- The live public.lab_results table drifted from the repo schema:
-- live has 10 columns (created_at, document_url, id, notes,
-- patient_id, reference_range, result_value, test_date, test_name,
-- unit) while the app writes/reads request_id, test_id,
-- technician_id, verified_at, is_abnormal (from the 2024 schema).
-- Result: the technician result-submit insert and the pathologist
-- verify mirror failed live (the verify failure surfaced as a
-- misleading "Failed to verify result" toast even though the
-- lab_tests verification itself succeeded).
--
-- This migration adds the missing columns idempotently. All are
-- nullable / defaulted: no existing data is touched.
-- ============================================================

ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS request_id UUID;

-- test_id carries a real FK: the app inserts lab_tests ids here, so the
-- patient-facing lab_tests(name) embed join resolves for new rows.

ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES public.lab_tests(id) ON DELETE SET NULL;

ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS is_abnormal BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lab_results_request_id ON public.lab_results(request_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test_id ON public.lab_results(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);
