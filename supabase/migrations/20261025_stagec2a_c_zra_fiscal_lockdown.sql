-- Stage C2a (Cluster C) — 2026-10-25
--
-- P2-13 (conditional): ZRA fiscal tables left world-writable by a
-- manual file (zra-vsdc-fiscal-schema.sql, repo root).
--
-- Live verification performed before writing this (2026-10-24):
--   * The manual file's WITH CHECK (true) / USING (true) write
--     policies ("Service can insert/update fiscal submissions",
--     "Service can insert operation logs") are GONE live — the
--     superseding migration did run; nothing is world-writable in
--     that original form, and no table has a USING(true) write policy.
--   * BUT every "own institution" policy carries a tautology in its
--     personnel branch:
--       institution_personnel.institution_id = institution_personnel.institution_id
--     which is true for EVERY row — so ANY user who is personnel at
--     ANY institution satisfies the check for EVERY institution.
--     Effects live today:
--       - fiscal_submissions / institution_zra_item_mappings /
--         vsdc_operation_logs / institution_smart_invoice_settings:
--         readable across all institutions by any institution's staff.
--       - zra_smart_invoice_config: a single FOR ALL policy with the
--         same tautology — any institution's staff can INSERT /
--         UPDATE / DELETE ANY institution's ZRA config (incl. TPIN).
--   * fiscal_submissions has NO client UPDATE policy although
--     src/pages/ZraSmartInvoiceIntegration.tsx updates submission
--     status from the client (the write is silently RLS-denied today),
--     and vsdc_operation_logs has NO client INSERT policy although the
--     same page inserts log rows from the client.
--
-- Fix: two DEFINER helpers capture "member of THIS institution"
-- (institution admin_id, or institution_personnel of THIS institution,
-- or platform admin/super_admin) and "admin of THIS institution"
-- (admin_id or platform admin). All affected policies are rewritten
-- with them. Writes land on: institution admins (config, settings,
-- mappings — as before, minus the tautology), institution members
-- (submission status updates + operation-log inserts — the two client
-- flows), and service_role everywhere (no policy needed). Client
-- INSERT/DELETE on fiscal_submissions stays policy-less = denied;
-- submissions are created server-side.
-- (Helpers are DEFINER per the house pattern; EXECUTE is revoked from
-- PUBLIC/anon and granted to authenticated — P2-16 lesson.)

CREATE OR REPLACE FUNCTION public.is_zra_institution_member(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (
       public.has_admin_scope(auth.uid())
       OR EXISTS (
         SELECT 1 FROM public.healthcare_institutions hi
         WHERE hi.id = p_institution_id AND hi.admin_id = auth.uid()
       )
       OR EXISTS (
         SELECT 1 FROM public.institution_personnel ip
         WHERE ip.institution_id = p_institution_id AND ip.user_id = auth.uid()
       )
     );
$$;

CREATE OR REPLACE FUNCTION public.is_zra_institution_admin(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (
       public.has_admin_scope(auth.uid())
       OR EXISTS (
         SELECT 1 FROM public.healthcare_institutions hi
         WHERE hi.id = p_institution_id AND hi.admin_id = auth.uid()
       )
     );
$$;

REVOKE ALL ON FUNCTION public.is_zra_institution_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_zra_institution_admin(uuid) FROM PUBLIC, anon;
-- anon also gets EXECUTE: the policies are TO public, so anon evaluates
-- them too — without EXECUTE anon would get a 42501 error instead of a
-- clean empty result. The helpers return false for anon anyway
-- (auth.uid() IS NOT NULL guard), so this leaks nothing.
GRANT EXECUTE ON FUNCTION public.is_zra_institution_member(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_zra_institution_admin(uuid) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------
-- fiscal_submissions: read = own-institution members; status updates
-- by own-institution members (ZRA integration page); no client
-- INSERT/DELETE (server-side creation only).
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own institution submissions" ON public.fiscal_submissions;
CREATE POLICY "Users can view own institution submissions"
  ON public.fiscal_submissions FOR SELECT TO public
  USING (public.is_zra_institution_member(institution_id));

DROP POLICY IF EXISTS "Institution members can update own institution submissions" ON public.fiscal_submissions;
CREATE POLICY "Institution members can update own institution submissions"
  ON public.fiscal_submissions FOR UPDATE TO public
  USING (public.is_zra_institution_member(institution_id))
  WITH CHECK (public.is_zra_institution_member(institution_id));

-- ------------------------------------------------------------------
-- institution_zra_item_mappings: read = members; write = admins
-- (unchanged intent, tautology removed).
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own institution mappings" ON public.institution_zra_item_mappings;
CREATE POLICY "Users can view own institution mappings"
  ON public.institution_zra_item_mappings FOR SELECT TO public
  USING (public.is_zra_institution_member(institution_id));

DROP POLICY IF EXISTS "Users can insert own institution mappings" ON public.institution_zra_item_mappings;
CREATE POLICY "Users can insert own institution mappings"
  ON public.institution_zra_item_mappings FOR INSERT TO public
  WITH CHECK (public.is_zra_institution_admin(institution_id));

DROP POLICY IF EXISTS "Users can update own institution mappings" ON public.institution_zra_item_mappings;
CREATE POLICY "Users can update own institution mappings"
  ON public.institution_zra_item_mappings FOR UPDATE TO public
  USING (public.is_zra_institution_admin(institution_id))
  WITH CHECK (public.is_zra_institution_admin(institution_id));

-- ------------------------------------------------------------------
-- zra_smart_invoice_config: was one FOR ALL policy (tautology =
-- cross-institution write). Split: read = members; write = admins.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can upsert ZRA config" ON public.zra_smart_invoice_config;
DROP POLICY IF EXISTS "Users can view ZRA config" ON public.zra_smart_invoice_config;

CREATE POLICY "Users can view ZRA config"
  ON public.zra_smart_invoice_config FOR SELECT TO public
  USING (public.is_zra_institution_member(institution_id));

CREATE POLICY "Institution admins can insert ZRA config"
  ON public.zra_smart_invoice_config FOR INSERT TO public
  WITH CHECK (public.is_zra_institution_admin(institution_id));

CREATE POLICY "Institution admins can update ZRA config"
  ON public.zra_smart_invoice_config FOR UPDATE TO public
  USING (public.is_zra_institution_admin(institution_id))
  WITH CHECK (public.is_zra_institution_admin(institution_id));

CREATE POLICY "Institution admins can delete ZRA config"
  ON public.zra_smart_invoice_config FOR DELETE TO public
  USING (public.is_zra_institution_admin(institution_id));

-- ------------------------------------------------------------------
-- institution_smart_invoice_settings: same tautology in the SELECT
-- branch (the credential-bearing settings table). INSERT/UPDATE were
-- already admin-scoped; rewrite all three with the helpers. The
-- service_role SELECT ("Server can view encrypted credentials") is
-- untouched.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own institution settings" ON public.institution_smart_invoice_settings;
CREATE POLICY "Users can view own institution settings"
  ON public.institution_smart_invoice_settings FOR SELECT TO public
  USING (public.is_zra_institution_member(institution_id));

DROP POLICY IF EXISTS "Users can insert own institution settings" ON public.institution_smart_invoice_settings;
CREATE POLICY "Users can insert own institution settings"
  ON public.institution_smart_invoice_settings FOR INSERT TO public
  WITH CHECK (public.is_zra_institution_admin(institution_id));

DROP POLICY IF EXISTS "Users can update own institution settings" ON public.institution_smart_invoice_settings;
CREATE POLICY "Users can update own institution settings"
  ON public.institution_smart_invoice_settings FOR UPDATE TO public
  USING (public.is_zra_institution_admin(institution_id))
  WITH CHECK (public.is_zra_institution_admin(institution_id));

-- ------------------------------------------------------------------
-- vsdc_operation_logs: read = members; the client page inserts log
-- rows — add the scoped INSERT the manual file's WITH CHECK (true)
-- used to (over-)provide.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own institution logs" ON public.vsdc_operation_logs;
CREATE POLICY "Users can view own institution logs"
  ON public.vsdc_operation_logs FOR SELECT TO public
  USING (public.is_zra_institution_member(institution_id));

DROP POLICY IF EXISTS "Institution members can insert own institution logs" ON public.vsdc_operation_logs;
CREATE POLICY "Institution members can insert own institution logs"
  ON public.vsdc_operation_logs FOR INSERT TO public
  WITH CHECK (public.is_zra_institution_member(institution_id));

-- zra_tax_rates: intentionally untouched — public reference data
-- (SELECT USING(true), no write policies = writes denied to clients).
