-- HRMS: employee salary/department fields + payroll duplicate guard
-- Supports the "Run Payroll" feature and Employee Directory in HRManagerWorkflow.

-- 1. Salary + department on the existing personnel table
ALTER TABLE public.institution_personnel
  ADD COLUMN IF NOT EXISTS salary_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS department TEXT;

-- 2. Let institution staff (e.g. HR managers), not just the admin_id holder,
--    manage personnel records. Helpers are SECURITY DEFINER (no RLS recursion).
DROP POLICY IF EXISTS "Institution staff can manage personnel" ON public.institution_personnel;
CREATE POLICY "Institution staff can manage personnel"
  ON public.institution_personnel FOR ALL TO authenticated
  USING (
    public.is_institution_staff_member(institution_personnel.institution_id)
    OR public.is_institution_admin(institution_personnel.institution_id)
  )
  WITH CHECK (
    public.is_institution_staff_member(institution_personnel.institution_id)
    OR public.is_institution_admin(institution_personnel.institution_id)
  );

-- 3. Prevent duplicate payroll runs: one record per staff member per pay period.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_staff_period
  ON public.payroll_records (institution_id, staff_id, period_start, period_end);
