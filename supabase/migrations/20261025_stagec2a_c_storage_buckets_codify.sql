-- Stage C2a (Cluster C) — 2026-10-25
--
-- P2-30: buckets `receipts` and `medical_documents` were never created
-- in any migration; their live state existed only in the dashboard.
-- P2-29: receipt PDFs live at predictable paths (<paymentId>.pdf) and
-- the receipts SELECT policy existed live but nowhere in the repo.
--
-- Live verification performed before writing this (2026-10-24):
--   storage.buckets: receipts public=false, medical_documents
--   public=false (both already private — no world-readable exposure).
--   storage.objects already carried owner-scoped policies for both
--   buckets (receipts keyed to the linked payment's patient/provider;
--   medical_documents keyed to the owner folder). This migration
--   CODIFIES that verified-live state so a fresh environment rebuild
--   reproduces it exactly; every statement is idempotent and the
--   policy definitions match the live ones verbatim in effect.
--
-- The predictable receipt path is acceptable ONLY because the bucket
-- is private and the SELECT policy below scopes reads to the payment's
-- own patient/provider; generate-receipt writes with the service role
-- (bypasses RLS), and clients read via authenticated downloads checked
-- against these policies. Anon has no policy on either bucket.
--
-- DEFECT FOUND DURING PROOF (fixed here, was live): the pre-existing
-- receipts policies compared `payments.id::text = storage.filename(name)`,
-- but storage.filename() returns the name WITH its extension
-- ('<uuid>.pdf'), so the comparison could NEVER be true — the policies
-- matched nobody, and even the payment's own patient/provider was
-- RLS-denied (proven live with QA users: INSERT -> 403 AccessDenied).
-- The corrected predicate strips the extension:
-- split_part(storage.filename(name), '.', 1). Payment ids are UUIDs
-- (no dots), so the split is exact.

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false),
       ('medical_documents', 'medical_documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ------------------------------------------------------------------
-- receipts: owner = the linked payment's patient or provider.
-- The object name is `<paymentId>.pdf` (generate-receipt).
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
CREATE POLICY "Users can view their own receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.payments
      WHERE payments.id::text = split_part(storage.filename(objects.name), '.', 1)
        AND (payments.patient_id = auth.uid() OR payments.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.payments
      WHERE payments.id::text = split_part(storage.filename(objects.name), '.', 1)
        AND (payments.patient_id = auth.uid() OR payments.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
CREATE POLICY "Users can update own receipts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.payments
      WHERE payments.id::text = split_part(storage.filename(objects.name), '.', 1)
        AND (payments.patient_id = auth.uid() OR payments.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.payments
      WHERE payments.id::text = split_part(storage.filename(objects.name), '.', 1)
        AND (payments.patient_id = auth.uid() OR payments.provider_id = auth.uid())
    )
  );

-- ------------------------------------------------------------------
-- medical_documents: owner = first folder of the object path
-- (<user_id>/...), matching the live policies.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own medical documents" ON storage.objects;
CREATE POLICY "Users can view their own medical documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical_documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can upload their own medical documents" ON storage.objects;
CREATE POLICY "Users can upload their own medical documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical_documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own medical documents" ON storage.objects;
CREATE POLICY "Users can update own medical documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'medical_documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'medical_documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own medical documents" ON storage.objects;
CREATE POLICY "Users can delete own medical documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical_documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
