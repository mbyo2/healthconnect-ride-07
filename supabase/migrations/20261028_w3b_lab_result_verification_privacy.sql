-- W3b (QA sweep 2026-10-28) — P2: patients could read their own UNVERIFIED
-- lab values via PostgREST (lab_results.result_value / notes / is_abnormal /
-- document_url and lab_tests.result_summary / result), although the product
-- rule — honoured by the PatientLabResults UI — is that values are only
-- visible after a pathologist verifies the result.
--
-- LIVE-SCHEMA BASIS (introspected 2026-10-28, project tthzcijscedgxjfnfnky):
--   * lab_results (15 cols): result_value NOT NULL, notes, document_url,
--     is_abnormal are the value-bearing columns; verified_at is the
--     verification marker (set directly, or mirrored from lab_tests by
--     trg_mirror_lab_test_verification). test_name / unit / reference_range
--     / test_date are metadata and stay visible in the pending shell.
--   * lab_tests (31 cols): result_summary (text) and result (jsonb) are the
--     value-bearing columns; verified_at / verified_by mark verification
--     (status='completed' happens at result ENTRY, pre-verification, so
--     status is NOT a verification marker). notes on lab_tests is the
--     order-time clinician note, not a result — left visible.
--   * pathologist_reviews also carries result_value, but its only SELECT
--     policy is institution-staff — no patient path (probed: patient = 0).
--
-- WHY THIS SHAPE:
--   RLS is row-level: it cannot mask individual columns, and column
--   privileges cannot distinguish "the patient themself" from staff (both
--   are the `authenticated` role). So:
--   1. Base-table patient SELECT is restricted to VERIFIED rows on both
--      tables. EVERY own-row branch is closed, including the trap in
--      "Lab staff and care team can view lab results": has_care_relationship
--      returns TRUE for (uid, uid) — self counts as a care relationship —
--      so its patient branch is explicitly guarded to uid <> patient_id.
--      Staff / care-team / admin / lab-scope branches are byte-identical
--      for other people's rows, so provider, lab and pathologist
--      workflows (order → submit → verify) are unchanged.
--   2. The pending shell moves to two masking views,
--      lab_results_patient_view / lab_tests_patient_view: they return ALL
--      of the caller's own rows (so the patient still sees the test exists,
--      its name and status) with every value-bearing column NULL until
--      verified_at is set, and the real values afterwards.
--      The views are deliberately owner-run (NOT security_invoker — with
--      security_invoker the verified-only base RLS in step 1 would delete
--      the pending rows the shell exists to show, the same documented
--      exception pattern as provider_directory / shareable_equipment).
--      Their safety gate is inside the definition: WHERE patient_id =
--      auth.uid(), a SELECT-only grant to `authenticated` (never PUBLIC,
--      never anon), and no other columns or rows are reachable through
--      them. service_role keeps SELECT for server-side use.
--   3. Patient UI surfaces that render the shell (PatientLabResults,
--      PatientOverviewHero pending count) read the views. Surfaces that
--      list results as medical records (ComprehensiveMedicalRecords,
--      useMedicalRecords) keep reading the base tables and therefore now
--      only ever receive verified rows — the correct record semantics.
--
-- No profiles policies are touched, and no policy below contains an inline
-- cross-table subquery (house RLS-recursion rule); all cross-table checks
-- stay inside the existing SECURITY DEFINER helpers.

-- ---------------------------------------------------------------------------
-- 1. lab_results — patient SELECT becomes verified-only
-- ---------------------------------------------------------------------------
DROP POLICY "Users can view their own lab results" ON public.lab_results;
CREATE POLICY "Users can view their own lab results"
  ON public.lab_results
  FOR SELECT TO public
  USING (auth.uid() = patient_id AND verified_at IS NOT NULL);

DROP POLICY "Lab staff and care team can view lab results" ON public.lab_results;
CREATE POLICY "Lab staff and care team can view lab results"
  ON public.lab_results
  FOR SELECT TO authenticated
  USING (
    (auth.uid() = patient_id AND verified_at IS NOT NULL)
    OR (auth.uid() <> patient_id AND has_care_relationship(auth.uid(), patient_id))
    OR has_admin_scope(auth.uid())
    OR lab_result_in_scope(request_id, test_id, technician_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. lab_tests — patient branches become verified-only (staff branches
--    reproduced verbatim from the live definitions)
-- ---------------------------------------------------------------------------
DROP POLICY "lab_tests_patient_select" ON public.lab_tests;
CREATE POLICY "lab_tests_patient_select"
  ON public.lab_tests
  FOR SELECT TO public
  USING (patient_id = auth.uid() AND verified_at IS NOT NULL);

DROP POLICY "Scoped lab test access" ON public.lab_tests;
CREATE POLICY "Scoped lab test access"
  ON public.lab_tests
  FOR SELECT TO authenticated
  USING (
    (patient_id = auth.uid() AND verified_at IS NOT NULL)
    OR (ordered_by = auth.uid())
    OR has_admin_scope(auth.uid())
    OR is_service_role()
    OR (performed_by = auth.uid())
    OR (verified_by = auth.uid())
    OR lab_institution_access(lab_id, auth.uid())
    OR lab_institution_access(institution_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Masking views for the patient pending shell (see header: owner-run by
--    design, own-row filter inside the definition, scoped grants)
-- ---------------------------------------------------------------------------
CREATE VIEW public.lab_results_patient_view AS
SELECT
  id,
  patient_id,
  test_name,
  test_date,
  CASE WHEN verified_at IS NOT NULL THEN result_value END AS result_value,
  unit,
  reference_range,
  CASE WHEN verified_at IS NOT NULL THEN notes END AS notes,
  CASE WHEN verified_at IS NOT NULL THEN document_url END AS document_url,
  CASE WHEN verified_at IS NOT NULL THEN is_abnormal END AS is_abnormal,
  created_at,
  request_id,
  test_id,
  verified_at
FROM public.lab_results
WHERE patient_id = auth.uid();

COMMENT ON VIEW public.lab_results_patient_view IS
  'Patient pending shell for lab results (W3b 2026-10-28): own rows only (patient_id = auth.uid() in the definition); value-bearing columns (result_value, notes, document_url, is_abnormal) are NULL until verified_at is set. Deliberately NOT security_invoker — the verified-only base RLS would delete the pending rows. SELECT granted to authenticated only.';

-- (Project default privileges auto-grant full DML to authenticated /
-- service_role on new views; strip everything except SELECT — the views
-- are read-only shells and are not auto-updatable in any case.)
REVOKE ALL ON public.lab_results_patient_view FROM public, anon, authenticated, service_role;
GRANT SELECT ON public.lab_results_patient_view TO authenticated;
GRANT SELECT ON public.lab_results_patient_view TO service_role;

CREATE VIEW public.lab_tests_patient_view AS
SELECT
  id,
  lab_id,
  patient_id,
  admission_id,
  test_number,
  test_type,
  test_category,
  ordered_by,
  priority,
  status,
  sample_type,
  sample_collected_at,
  CASE WHEN verified_at IS NOT NULL THEN result END AS result,
  CASE WHEN verified_at IS NOT NULL THEN result_summary END AS result_summary,
  results_date,
  performed_by,
  verified_by,
  notes,
  created_at,
  updated_at,
  price,
  total_amount,
  balance,
  insurance_claim_id,
  payment_status,
  verified_at,
  institution_id,
  entered_by,
  order_source,
  external_referrer_name,
  external_referrer_facility
FROM public.lab_tests
WHERE patient_id = auth.uid();

COMMENT ON VIEW public.lab_tests_patient_view IS
  'Patient pending shell for lab orders (W3b 2026-10-28): own rows only (patient_id = auth.uid() in the definition); value-bearing columns (result, result_summary) are NULL until verified_at is set. Deliberately NOT security_invoker — the verified-only base RLS would delete the pending rows. SELECT granted to authenticated only.';

REVOKE ALL ON public.lab_tests_patient_view FROM public, anon, authenticated, service_role;
GRANT SELECT ON public.lab_tests_patient_view TO authenticated;
GRANT SELECT ON public.lab_tests_patient_view TO service_role;

NOTIFY pgrst, 'reload schema';
