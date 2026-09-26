-- ============================================================================
-- Phase 1 DB hardening — 2026-09-26
-- Launch plan: "perfect by next week". All changes are ADDITIVE.
-- Triage:  workspace/goals/doc0clock-clinic-launch/files/phase-0-db-triage.md
-- Verified against production schema 2026-09-25 (read-only inspection).
-- Apply with before/after proof for each section. DO NOT apply blindly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. lab_tests: clinical staff access
-- Prod finding (2026-09-25): pathologist and phlebotomist had NO access at all
-- (not even SELECT) to lab_tests; writes were admin/super_admin only.
-- lab_tests rows are test orders (patient_id, ordered_by, sample collection,
-- verification) — phlebotomists collect samples, pathologists verify results.
-- ----------------------------------------------------------------------------

-- 1a. Pathologists + phlebotomists can view test orders
CREATE POLICY "Lab clinical staff can view lab tests"
ON public.lab_tests FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'pathologist'::app_role)
  OR public.has_role(auth.uid(), 'phlebotomist'::app_role)
);

-- 1b. Lab technicians + pathologists can manage the test catalog/orders
CREATE POLICY "Lab staff can manage lab tests"
ON public.lab_tests FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'lab_technician'::app_role)
  OR public.has_role(auth.uid(), 'pathologist'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'lab_technician'::app_role)
  OR public.has_role(auth.uid(), 'pathologist'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 1c. Phlebotomists can mark samples as collected (UPDATE only, no
--     insert/delete — they work the collection queue, not the catalog)
CREATE POLICY "Phlebotomists can update sample collection"
ON public.lab_tests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'phlebotomist'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'phlebotomist'::app_role));

-- ----------------------------------------------------------------------------
-- 2. Module charter tables: enable RLS (was DISABLED, zero policies)
-- Read: any signed-in user (dashboards, settings, admin tools all run authed).
-- Write: superadmin only — the charter is the product's module taxonomy;
--        per-institution changes go through institution_module_entitlements.
-- ----------------------------------------------------------------------------

ALTER TABLE public.facility_module_charter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_module_charter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Charters readable by authenticated users"
ON public.facility_module_charter FOR SELECT TO authenticated USING (true);

CREATE POLICY "Charters readable by authenticated users"
ON public.provider_module_charter FOR SELECT TO authenticated USING (true);

CREATE POLICY "Charters writable by superadmin"
ON public.facility_module_charter FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Charters writable by superadmin"
ON public.provider_module_charter FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ----------------------------------------------------------------------------
-- 3. pharmacy_customers: prevent duplicate customer rows per pharmacy
-- PRE-CHECK (run before applying): if this returns rows, dedupe first —
--   SELECT pharmacy_id, phone, COUNT(*) FROM public.pharmacy_customers
--   GROUP BY pharmacy_id, phone HAVING COUNT(*) > 1;
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_customers_pharmacy_phone
ON public.pharmacy_customers (pharmacy_id, phone);

-- ----------------------------------------------------------------------------
-- 4. payments: index for provider revenue lookups
-- (columns verified: provider_id, status, created_at)
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_payments_provider_status_created
ON public.payments (provider_id, status, created_at);

-- ----------------------------------------------------------------------------
-- 5. lab_tests: index for per-lab order lookups
-- (columns verified: lab_id, created_at)
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_lab_tests_lab_created
ON public.lab_tests (lab_id, created_at);

-- ----------------------------------------------------------------------------
-- 6. POS: institution admins can read their facility's sales data
-- Prod finding (2026-09-25): pos_sales / pos_sale_items / pos_register_sessions
-- were visible only to the cashier who rang the sale (cashier_id = auth.uid())
-- plus pharmacy admins — a hospital/clinic admin could not see their own
-- facility's sales. Tenant-scoped via healthcare_institutions.admin_id.
-- ----------------------------------------------------------------------------

CREATE POLICY "Institution admins can view pharmacy sales"
ON public.pos_sales FOR SELECT TO authenticated
USING (public.is_institution_admin(pharmacy_id));

CREATE POLICY "Institution admins can view sale items"
ON public.pos_sale_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pos_sales s
    WHERE s.id = pos_sale_items.sale_id
    AND public.is_institution_admin(s.pharmacy_id)
  )
);

CREATE POLICY "Institution admins can view register sessions"
ON public.pos_register_sessions FOR SELECT TO authenticated
USING (public.is_institution_admin(pharmacy_id));

-- ============================================================================
-- VERIFICATION (run after applying; record before/after in the launch log)
--  1. pg_policies WHERE tablename='lab_tests'           -> 6 policies
--  2. relrowsecurity on both charter tables = true; 4 policies
--  3. pg_indexes uq_pharmacy_customers_pharmacy_phone exists
--  4. pg_indexes idx_payments_provider_status_created exists
--  5. pg_indexes idx_lab_tests_lab_created exists
--  6. pg_policies on pos_sales/pos_sale_items/pos_register_sessions
--     -> "Institution admins can view ..." present
-- ============================================================================
