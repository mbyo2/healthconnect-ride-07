-- Stage C2b Cluster A — 2026-10-25
--
-- P3-2: POS cashiers could UPDATE/DELETE their own COMPLETED pos_sales
-- rows (live policy "Pharmacy staff can manage sales", FOR ALL,
-- cashier_id = auth.uid(), no status restriction, no WITH CHECK) —
-- till-fraud erasure: a completed sale could be edited or deleted after
-- the cash was taken.
--
-- App usage checked first (src/components/pharmacy/PharmacyPOS.tsx):
--   * INSERT a sale born status='completed' (cashier_id = user) — kept.
--   * INSERT pos_sale_items for that sale — kept (see companion split in
--     the WITH CHECK migration is not needed; items are handled below).
--   * Close/open pos_register_sessions — a different table, untouched.
--   * The one conflicting path: on FEFO-dispense failure the POS tries
--     to DELETE the just-created completed sale as a rollback. That
--     delete is now refused by design (completed sales are immutable to
--     cashiers); corrections must be manager/service-role reversals
--     (status 'voided'/'refunded'), as the audit prescribes. The client
--     ignores the delete result today, so the failure toast still shows;
--     routing that rollback through a privileged void path is a noted
--     follow-up in the C2b addendum.
--   * No app path lets a cashier edit a draft/pending sale, but the
--     status vocabulary includes 'pending', and UPDATE/DELETE on
--     non-completed own sales is preserved for completeness.
--
-- Resulting write model for pos_sales:
--   * cashier: INSERT own rows; UPDATE/DELETE only rows whose CURRENT
--     status is not 'completed' (and an UPDATE may not be used to move
--     a row into a different cashier's name).
--   * privileged: institution admin of the pharmacy (admin_id), platform
--     admin / super_admin (user_roles), or service role — full write
--     access, including voiding/refunding a completed sale.

DROP POLICY IF EXISTS "Pharmacy staff can manage sales" ON public.pos_sales;

DROP POLICY IF EXISTS "Pharmacy staff can create sales" ON public.pos_sales;
CREATE POLICY "Pharmacy staff can create sales"
  ON public.pos_sales FOR INSERT
  TO authenticated
  WITH CHECK (
    cashier_id = auth.uid()
    OR public.is_service_role()
    OR public.is_institution_admin(pharmacy_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Pharmacy staff can update non-completed sales" ON public.pos_sales;
CREATE POLICY "Pharmacy staff can update non-completed sales"
  ON public.pos_sales FOR UPDATE
  TO authenticated
  USING (
    public.is_service_role()
    OR public.is_institution_admin(pharmacy_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (cashier_id = auth.uid() AND status <> 'completed')
  )
  WITH CHECK (
    public.is_service_role()
    OR public.is_institution_admin(pharmacy_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    -- USING already pins the OLD row to non-completed for cashiers, so a
    -- cashier may move their own pending sale to 'completed' with this
    -- update; they still cannot touch a sale that was already completed.
    OR cashier_id = auth.uid()
  );

DROP POLICY IF EXISTS "Pharmacy staff can delete non-completed sales" ON public.pos_sales;
CREATE POLICY "Pharmacy staff can delete non-completed sales"
  ON public.pos_sales FOR DELETE
  TO authenticated
  USING (
    public.is_service_role()
    OR public.is_institution_admin(pharmacy_id)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (cashier_id = auth.uid() AND status <> 'completed')
  );

-- pos_sale_items: the same erasure channel one level down. Split the
-- FOR ALL policy the same way: cashiers may INSERT items for their own
-- sales (the POS inserts items after the completed sale row exists, so
-- INSERT is not status-gated), but may UPDATE/DELETE items only while
-- the parent sale is not 'completed'. Privileged callers keep full
-- access (void/refund corrections happen at sale + item level).
DROP POLICY IF EXISTS "Pharmacy staff can manage sale items" ON public.pos_sale_items;

DROP POLICY IF EXISTS "Pharmacy staff can create sale items" ON public.pos_sale_items;
CREATE POLICY "Pharmacy staff can create sale items"
  ON public.pos_sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.pos_sales s
      WHERE s.id = pos_sale_items.sale_id
        AND (s.cashier_id = auth.uid()
             OR public.is_institution_admin(s.pharmacy_id)
             OR public.has_role(auth.uid(), 'admin'::public.app_role)
             OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    )
  );

DROP POLICY IF EXISTS "Pharmacy staff can update items of non-completed sales" ON public.pos_sale_items;
CREATE POLICY "Pharmacy staff can update items of non-completed sales"
  ON public.pos_sale_items FOR UPDATE
  TO authenticated
  USING (
    public.is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.pos_sales s
      WHERE s.id = pos_sale_items.sale_id
        AND (public.is_institution_admin(s.pharmacy_id)
             OR public.has_role(auth.uid(), 'admin'::public.app_role)
             OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
             OR (s.cashier_id = auth.uid() AND s.status <> 'completed'))
    )
  )
  WITH CHECK (
    public.is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.pos_sales s
      WHERE s.id = pos_sale_items.sale_id
        AND (public.is_institution_admin(s.pharmacy_id)
             OR public.has_role(auth.uid(), 'admin'::public.app_role)
             OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
             OR (s.cashier_id = auth.uid() AND s.status <> 'completed'))
    )
  );

DROP POLICY IF EXISTS "Pharmacy staff can delete items of non-completed sales" ON public.pos_sale_items;
CREATE POLICY "Pharmacy staff can delete items of non-completed sales"
  ON public.pos_sale_items FOR DELETE
  TO authenticated
  USING (
    public.is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.pos_sales s
      WHERE s.id = pos_sale_items.sale_id
        AND (public.is_institution_admin(s.pharmacy_id)
             OR public.has_role(auth.uid(), 'admin'::public.app_role)
             OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
             OR (s.cashier_id = auth.uid() AND s.status <> 'completed'))
    )
  );

DROP POLICY IF EXISTS "Pharmacy staff can view own sale items" ON public.pos_sale_items;
CREATE POLICY "Pharmacy staff can view own sale items"
  ON public.pos_sale_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pos_sales s
      WHERE s.id = pos_sale_items.sale_id AND s.cashier_id = auth.uid()
    )
  );
