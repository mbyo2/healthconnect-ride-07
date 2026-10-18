-- ============================================================
-- Tighten RLS on accounting tables: institution-scoped access
-- Replaces the original USING (true) policies from
-- 20260810_accounting_and_multi_country_hrms.sql.
-- Financial data must never be visible across institutions.
-- ============================================================

-- 1. chart_of_accounts
DROP POLICY IF EXISTS "Authenticated users access chart of accounts" ON public.chart_of_accounts;

CREATE POLICY "Institution staff read chart of accounts"
  ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  );

CREATE POLICY "Institution staff write chart of accounts"
  ON public.chart_of_accounts FOR INSERT TO authenticated
  WITH CHECK (
    institution_id IS NOT NULL AND (
      public.is_institution_staff_member(institution_id)
      OR public.is_institution_admin(institution_id)
    )
  );

CREATE POLICY "Institution staff update chart of accounts"
  ON public.chart_of_accounts FOR UPDATE TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  )
  WITH CHECK (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  );

CREATE POLICY "Institution staff delete chart of accounts"
  ON public.chart_of_accounts FOR DELETE TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  );

-- 2. journal_entries (immutable audit trail: no UPDATE, no DELETE)
DROP POLICY IF EXISTS "Authenticated users access journal entries" ON public.journal_entries;

CREATE POLICY "Institution staff read journal entries"
  ON public.journal_entries FOR SELECT TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  );

CREATE POLICY "Institution staff post journal entries"
  ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (
    institution_id IS NOT NULL AND (
      public.is_institution_staff_member(institution_id)
      OR public.is_institution_admin(institution_id)
    )
  );

-- 3. country_statutory_configs
DROP POLICY IF EXISTS "Authenticated users access country statutory configs" ON public.country_statutory_configs;

CREATE POLICY "Institution staff read statutory configs"
  ON public.country_statutory_configs FOR SELECT TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  );

CREATE POLICY "Institution staff write statutory configs"
  ON public.country_statutory_configs FOR ALL TO authenticated
  USING (
    public.is_institution_staff_member(institution_id)
    OR public.is_institution_admin(institution_id)
  )
  WITH CHECK (
    institution_id IS NOT NULL AND (
      public.is_institution_staff_member(institution_id)
      OR public.is_institution_admin(institution_id)
    )
  );
