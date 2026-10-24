-- Stage C2b Cluster A — 2026-10-25 (follow-up to pos_sales_immutability)
--
-- Proof-driven fix: after splitting the pos_sales FOR ALL policy, the
-- privileged UPDATE/DELETE branches (platform admin / super_admin via
-- has_role) matched 0 rows in live PostgREST + role-switched SQL proofs,
-- because no SELECT policy on pos_sales covers platform admins (the old
-- FOR ALL policy had been the cashier's SELECT path as well, and the
-- surviving SELECT policies cover only the cashier, institution staff,
-- and the institution's admin_id). Rows a caller cannot select are not
-- reachable for update through the API paths the admin UI uses.
-- Institution admins already have "Institution admins can view pharmacy
-- sales" / "...sale items"; this adds the platform-admin equivalent.
-- Cashier and staff visibility is unchanged.

DROP POLICY IF EXISTS "Platform admins can view pharmacy sales" ON public.pos_sales;
CREATE POLICY "Platform admins can view pharmacy sales"
  ON public.pos_sales FOR SELECT
  TO authenticated
  USING (
    public.is_service_role()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Platform admins can view sale items" ON public.pos_sale_items;
CREATE POLICY "Platform admins can view sale items"
  ON public.pos_sale_items FOR SELECT
  TO authenticated
  USING (
    public.is_service_role()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );
