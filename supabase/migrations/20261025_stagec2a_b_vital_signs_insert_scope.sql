-- Stage C2a Cluster B — P2-4: vital_signs INSERT was role-only.
--
-- Live state before this migration (pg_policies, 2026-10-24):
--   * "Providers can record patient vital signs" (INSERT): appointment
--     branch OR a bare clinician-role branch — the OR makes the role
--     branch sufficient on its own.
--   * "Users and providers can insert vital signs" (INSERT):
--     auth.uid() = user_id OR a bare clinician-role branch.
-- Either policy lets ANY nurse/doctor/pharmacist account write vitals
-- for ANY patient on the platform. Fabricated vitals pollute records
-- that drive triage.
--
-- Fix: patient-bound vitals require a care relationship, evaluated by
-- the SECURITY DEFINER helper can_record_vitals_for() (cross-table
-- checks live in a DEFINER helper, never inline in a policy):
--   * caller holds a clinician role (union of both legacy role lists), AND
--   * caller is the appointment provider for this patient, OR
--   * the patient has an appointment at an institution the caller is an
--     active staff member of, OR
--   * the patient is actively linked (patient_institution_links) to an
--     institution the caller is an active staff member of.
-- The patient self-entry path (auth.uid() = user_id — ManualVitalsEntry,
-- patient FHIR self-import) is preserved verbatim.
--
-- Client flows checked (src): NurseWorkflow inserts vitals for patients
-- seen at the nurse's institution (covered by the institution branches);
-- FHIRImportPanel is only mounted with patientId = the caller's own id
-- (MedicalRecords.tsx), i.e. the self path.

CREATE OR REPLACE FUNCTION public.can_record_vitals_for(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY[
          'nurse','registered_nurse','enrolled_nurse','midwife',
          'doctor','specialist','clinical_officer','medical_licentiate',
          'pharmacist'
        ]::public.app_role[])
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.patient_id = p_patient_id
          AND a.provider_id = auth.uid()
          AND a.status IN ('scheduled','confirmed','in_progress','completed')
      )
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.patient_id = p_patient_id
          AND a.institution_id IS NOT NULL
          AND a.status IN ('scheduled','confirmed','in_progress','completed')
          AND public.is_institution_staff_member(a.institution_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.patient_institution_links l
        WHERE l.patient_id = p_patient_id
          AND l.status = 'active'
          AND public.is_institution_staff_member(l.institution_id)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_record_vitals_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_record_vitals_for(uuid) TO authenticated;

DROP POLICY IF EXISTS "Providers can record patient vital signs" ON public.vital_signs;
DROP POLICY IF EXISTS "Users and providers can insert vital signs" ON public.vital_signs;

CREATE POLICY "Record vitals for self or care-relationship patient"
  ON public.vital_signs
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = user_id
    OR public.can_record_vitals_for(user_id)
  );
