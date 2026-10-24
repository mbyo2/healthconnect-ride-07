-- Stage C2a Cluster B — P2-7: health_data_transfers consent was
-- self-asserted by the requester for an arbitrary patient.
--
-- Live state before this migration: the only INSERT policy was
--   WITH CHECK (auth.uid() = transferred_by AND consent_given = true)
-- with NO constraint on patient_id — any authenticated user could
-- fabricate an audit-grade "consented" transfer record naming any
-- patient and any pair of institutions.
--
-- App flow (checked in src): the only writers are
-- HealthHistoryTransfer.tsx (patient exports their own history) and
-- FHIRImportPanel.tsx (patient imports their own records). Both are
-- mounted ONLY in MedicalRecords.tsx with patientId = the caller's own
-- user id, transferred_by = the caller. There is no staff-initiated
-- transfer flow in the client today.
--
-- Fix: a transfer record may only be created for the caller
-- themselves (patient_id = auth.uid(), the patient-initiated flow the
-- app actually uses) or by a platform admin (admin / super_admin in
-- user_roles) acting in an audited support capacity. transferred_by
-- must still be the caller and consent_given must still be asserted —
-- but now the consenting party is bound to the caller-as-patient, so
-- consent can no longer be asserted on someone else's behalf.

DROP POLICY IF EXISTS "Users create transfer records" ON public.health_data_transfers;

CREATE POLICY "Patients create own transfer records; admins may record transfers"
  ON public.health_data_transfers
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = transferred_by
    AND consent_given = true
    AND (
      patient_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    )
  );
