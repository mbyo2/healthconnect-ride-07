-- Stage C2a Cluster B — P2-6 + P2-12: tenant-scope personnel & payroll.
--
-- P2-6 live state: institution_personnel carried
--   "Institution staff can manage personnel" FOR ALL TO authenticated
--   USING/WITH CHECK (is_institution_staff_member(institution_id)
--                     OR is_institution_admin(institution_id))
-- i.e. ANY active staff member of an institution could INSERT/UPDATE/
-- DELETE every personnel row of that institution — including their own
-- salary_monthly and role (HR-record fraud inside a tenant, and a
-- stepping stone where other policies trust personnel rows).
--
-- Fix: reads keep the app's shape (own-institution staff can view the
-- roster — StaffRoster, CXO dashboard, InstitutionPatients,
-- useHRModule all read personnel lists as ordinary staff), writes are
-- restricted to:
--   * the institution owner (healthcare_institutions.admin_id — the
--     existing "Institution admins can manage their personnel" FOR ALL
--     policy, kept), or
--   * a holder of the institution_admin or hr_manager role (user_roles)
--     who is themselves an active staff member of THAT institution.
-- HR keeps its own-institution employee management (useHRModule
-- upsertEmployee / setEmployeeStatus run as hr_manager); a receptionist
-- can no longer edit salaries, and no one can write another
-- institution's rows.
--
-- P2-12 live state: payroll_records carried one FOR ALL policy
--   (is_institution_admin(institution_id) OR has_role('hr_manager'))
-- — the hr_manager branch had NO institution scoping: any hr_manager
-- anywhere managed every institution's payroll.
--
-- Fix: hr_manager must also be an active staff member of the record's
-- institution. Institution owners keep full access via
-- is_institution_admin(). "Staff can view own payroll only"
-- (staff_id = auth.uid()) is untouched. No platform-admin payroll flow
-- exists in src (payroll is only used by useHRModule inside an
-- institution context), so no super_admin branch is added.

-- ── P2-6: institution_personnel ─────────────────────────────────────
DROP POLICY IF EXISTS "Institution staff can manage personnel" ON public.institution_personnel;

CREATE POLICY "Institution staff can view personnel"
  ON public.institution_personnel
  FOR SELECT
  TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  );

CREATE POLICY "Institution admins and HR can insert personnel"
  ON public.institution_personnel
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR (
      (public.has_role(auth.uid(), 'institution_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'hr_manager'::public.app_role))
      AND public.is_institution_staff_member(institution_id)
    )
  );

CREATE POLICY "Institution admins and HR can update personnel"
  ON public.institution_personnel
  FOR UPDATE
  TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR (
      (public.has_role(auth.uid(), 'institution_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'hr_manager'::public.app_role))
      AND public.is_institution_staff_member(institution_id)
    )
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR (
      (public.has_role(auth.uid(), 'institution_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'hr_manager'::public.app_role))
      AND public.is_institution_staff_member(institution_id)
    )
  );

CREATE POLICY "Institution admins and HR can delete personnel"
  ON public.institution_personnel
  FOR DELETE
  TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR (
      (public.has_role(auth.uid(), 'institution_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'hr_manager'::public.app_role))
      AND public.is_institution_staff_member(institution_id)
    )
  );

-- ── P2-12: payroll_records ──────────────────────────────────────────
DROP POLICY IF EXISTS "HR and institution admins manage payroll" ON public.payroll_records;

CREATE POLICY "HR and institution admins manage own-institution payroll"
  ON public.payroll_records
  FOR ALL
  TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR (
      public.has_role(auth.uid(), 'hr_manager'::public.app_role)
      AND public.is_institution_staff_member(institution_id)
    )
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR (
      public.has_role(auth.uid(), 'hr_manager'::public.app_role)
      AND public.is_institution_staff_member(institution_id)
    )
  );
