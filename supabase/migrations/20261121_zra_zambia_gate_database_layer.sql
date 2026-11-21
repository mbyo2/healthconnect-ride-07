-- ZRA Smart Invoice — ZAMBIA-ONLY at the database layer (CEO rule,
-- 2026-11-21: "Even in supabase").
--
-- Two mechanisms, on top of the queue gate in
-- 20261121_zra_zambia_only_gate.sql (zra_country_eligible):
--
-- 1. RLS: the country check is folded into the house helpers
--    is_zra_institution_member / is_zra_institution_admin, which
--    nearly every ZRA policy already uses — so a direct PostgREST
--    call with a foreign institution admin's own JWT returns nothing
--    and writes nothing. The few policies that do not use those
--    helpers (settings owner SELECT, the service SELECT, the legacy
--    smart_invoices policies, and the public settings getter RPC)
--    are rewritten with the check added explicitly.
--    zra_tax_rates is global reference data with no institution_id —
--    it stays world-readable; it carries no institution data.
--    zra_internal_config has no policies at all (deny-all) already.
--
-- 2. WRITE BINDING: service_role bypasses RLS, so BEFORE INSERT /
--    UPDATE triggers on the connection/config/settings/mapping/log
--    tables — and BEFORE INSERT on fiscal_submissions (declaration
--    creation) — raise unless the institution is Zambian. No writer
--    (client, edge function, or hand-run SQL short of a deliberate
--    migration) can create ZRA configuration or a declaration for a
--    non-Zambian institution. fiscal_submissions UPDATE is NOT bound:
--    status transitions must stay possible (including closing out a
--    row if an institution's country ever changes).

-- ------------------------------------------------------------------
-- 1a. Fold the country check into the house helpers
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_zra_institution_member(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.zra_country_eligible(p_institution_id)
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
     AND public.zra_country_eligible(p_institution_id)
     AND (
       public.has_admin_scope(auth.uid())
       OR EXISTS (
         SELECT 1 FROM public.healthcare_institutions hi
         WHERE hi.id = p_institution_id AND hi.admin_id = auth.uid()
       )
     );
$$;

-- ------------------------------------------------------------------
-- 1b. Policies that do not route through the helpers
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Institution owners can view their settings"
  ON public.institution_smart_invoice_settings;
CREATE POLICY "Institution owners can view their settings"
  ON public.institution_smart_invoice_settings
  FOR SELECT
  TO public
  USING (
    public.zra_country_eligible(institution_id)
    AND (
      public.is_institution_admin(institution_id)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Server can view encrypted credentials"
  ON public.institution_smart_invoice_settings;
CREATE POLICY "Server can view encrypted credentials"
  ON public.institution_smart_invoice_settings
  FOR SELECT
  TO public
  USING (
    (auth.jwt() ->> 'role'::text) = 'service_role'::text
    AND public.zra_country_eligible(institution_id)
  );

DROP POLICY IF EXISTS "Users can view smart invoices" ON public.smart_invoices;
CREATE POLICY "Users can view smart invoices"
  ON public.smart_invoices FOR SELECT TO public
  USING (
    public.zra_country_eligible(institution_id)
    AND public.user_affiliated_with_institution(institution_id)
  );

DROP POLICY IF EXISTS "Users can insert smart invoices" ON public.smart_invoices;
CREATE POLICY "Users can insert smart invoices"
  ON public.smart_invoices FOR INSERT TO public
  WITH CHECK (
    public.zra_country_eligible(institution_id)
    AND public.user_affiliated_with_institution(institution_id)
  );

-- The staff settings getter (credentials stripped) closes for
-- non-Zambian institutions too.
CREATE OR REPLACE FUNCTION public.get_smart_invoice_settings_public(p_institution_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.zra_country_eligible(p_institution_id)
      AND (
        public.is_institution_admin(p_institution_id)
        OR public.is_institution_staff_member(p_institution_id)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
    THEN (
      SELECT to_jsonb(s) - 'encrypted_credentials'
      FROM public.institution_smart_invoice_settings s
      WHERE s.institution_id = p_institution_id
    )
    ELSE NULL
  END;
$$;

-- ------------------------------------------------------------------
-- 2. Write binding triggers (bind service_role too)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zra_assert_zambian_institution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.zra_country_eligible(NEW.institution_id) THEN
    RAISE EXCEPTION 'ZRA Smart Invoice is only available to institutions in Zambia.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.zra_assert_zambian_institution() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zra_assert_zambian_institution() TO service_role;

DROP TRIGGER IF EXISTS trg_zra_zambia_only ON public.institution_smart_invoice_settings;
CREATE TRIGGER trg_zra_zambia_only
  BEFORE INSERT OR UPDATE ON public.institution_smart_invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.zra_assert_zambian_institution();

DROP TRIGGER IF EXISTS trg_zra_zambia_only ON public.zra_smart_invoice_config;
CREATE TRIGGER trg_zra_zambia_only
  BEFORE INSERT OR UPDATE ON public.zra_smart_invoice_config
  FOR EACH ROW EXECUTE FUNCTION public.zra_assert_zambian_institution();

DROP TRIGGER IF EXISTS trg_zra_zambia_only ON public.institution_zra_item_mappings;
CREATE TRIGGER trg_zra_zambia_only
  BEFORE INSERT OR UPDATE ON public.institution_zra_item_mappings
  FOR EACH ROW EXECUTE FUNCTION public.zra_assert_zambian_institution();

DROP TRIGGER IF EXISTS trg_zra_zambia_only ON public.institution_zra_tax_mappings;
CREATE TRIGGER trg_zra_zambia_only
  BEFORE INSERT OR UPDATE ON public.institution_zra_tax_mappings
  FOR EACH ROW EXECUTE FUNCTION public.zra_assert_zambian_institution();

DROP TRIGGER IF EXISTS trg_zra_zambia_only ON public.vsdc_operation_logs;
CREATE TRIGGER trg_zra_zambia_only
  BEFORE INSERT ON public.vsdc_operation_logs
  FOR EACH ROW EXECUTE FUNCTION public.zra_assert_zambian_institution();

DROP TRIGGER IF EXISTS trg_zra_zambia_only ON public.smart_invoices;
CREATE TRIGGER trg_zra_zambia_only
  BEFORE INSERT OR UPDATE ON public.smart_invoices
  FOR EACH ROW EXECUTE FUNCTION public.zra_assert_zambian_institution();

-- Declaration creation is bound; status updates are not (see header).
DROP TRIGGER IF EXISTS trg_zra_zambia_only ON public.fiscal_submissions;
CREATE TRIGGER trg_zra_zambia_only
  BEFORE INSERT ON public.fiscal_submissions
  FOR EACH ROW EXECUTE FUNCTION public.zra_assert_zambian_institution();
