-- Stage B (Worker 2 — RLS cluster), part 2 of 3 — 2026-10-25
--
-- P1-4: comprehensive_prescriptions carried an UPDATE policy with NO
--       WITH CHECK ("Pharmacy staff can update visible prescriptions")
--       so any pharmacy-affiliated user could rewrite a visible row
--       into any state (reassign pharmacy / patient / status); the
--       unassigned-claim policy's WITH CHECK was role-only. The weak
--       no-check policy is dropped (the institution-scoped "Pharmacies
--       can update assigned prescription status" remains the update
--       path for assigned rows), the claim policy's WITH CHECK is
--       pinned to the caller's own pharmacy, and the assigned-status
--       policy is rebuilt on user_affiliated_with_institution (active
--       staff only). pharmacy_prescriptions had role-only pharmacist
--       SELECT/UPDATE with no WITH CHECK — replaced with
--       pharmacy-scoped policies; unassigned (pharmacy_id IS NULL)
--       rows stay visible to pharmacists for fulfilment pickup, which
--       matches how the app lists work.
-- P1-8: billing_invoices / billing_payments FOR ALL policies let ANY
--       active institution staff member (receptionists, nurses, ...)
--       create / edit / delete financial records. Writes are now
--       finance-scoped (billing_staff / finance_manager), reads stay
--       open to the institution's own staff for dashboards, and
--       DELETE is institution-admin / platform-admin only.
-- P1-9: service_pricing "Institution admins manage pricing" had
--       (institution_id IS NULL) as a caller-independent OR branch —
--       any signed-in user could rewrite the GLOBAL price book — and
--       anon held full DML grants on the table. Global rows are now
--       platform-admin only; the anon grants are revoked (RLS remains
--       the gate for authenticated).

-- ---------------------------------------------------------------------
-- P1-4: comprehensive_prescriptions
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Pharmacy staff can update visible prescriptions" ON public.comprehensive_prescriptions;

DROP POLICY IF EXISTS "Pharmacies can update assigned prescription status" ON public.comprehensive_prescriptions;

CREATE POLICY "Pharmacies can update assigned prescription status"
ON public.comprehensive_prescriptions FOR UPDATE
USING (
  pharmacy_id IS NOT NULL
  AND status IN ('pending', 'assigned', 'processing', 'ready')
  AND public.user_affiliated_with_institution(pharmacy_id)
)
WITH CHECK (
  pharmacy_id IS NOT NULL
  AND public.user_affiliated_with_institution(pharmacy_id)
);

DROP POLICY IF EXISTS "Pharmacists can claim and dispense unassigned prescriptions" ON public.comprehensive_prescriptions;

CREATE POLICY "Pharmacists can claim and dispense unassigned prescriptions"
ON public.comprehensive_prescriptions FOR UPDATE
USING (
  pharmacy_id IS NULL
  AND status IN ('pending', 'assigned')
  AND (
    public.has_role(auth.uid(), 'pharmacist'::app_role)
    OR public.has_role(auth.uid(), 'pharmacy_technologist'::app_role)
  )
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'pharmacist'::app_role)
    OR public.has_role(auth.uid(), 'pharmacy_technologist'::app_role)
  )
  AND (pharmacy_id IS NULL OR public.user_affiliated_with_institution(pharmacy_id))
  AND status IN ('pending', 'assigned', 'processing', 'ready', 'filled', 'partially_filled', 'cancelled')
);

-- ---------------------------------------------------------------------
-- P1-4: pharmacy_prescriptions — pharmacy-scoped pharmacist access
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "pharmacy_prescriptions_pharmacist_select" ON public.pharmacy_prescriptions;
DROP POLICY IF EXISTS "pharmacy_prescriptions_pharmacist_update" ON public.pharmacy_prescriptions;

CREATE POLICY "Pharmacists can view pharmacy prescriptions"
ON public.pharmacy_prescriptions FOR SELECT
USING (
  public.has_admin_scope(auth.uid())
  OR filled_by = auth.uid()
  OR (
    public.has_role(auth.uid(), 'pharmacist'::app_role)
    AND (pharmacy_id IS NULL OR public.user_affiliated_with_institution(pharmacy_id))
  )
);

CREATE POLICY "Pharmacists can update pharmacy prescriptions"
ON public.pharmacy_prescriptions FOR UPDATE
USING (
  public.has_admin_scope(auth.uid())
  OR filled_by = auth.uid()
  OR (
    public.has_role(auth.uid(), 'pharmacist'::app_role)
    AND (pharmacy_id IS NULL OR public.user_affiliated_with_institution(pharmacy_id))
  )
)
WITH CHECK (
  public.has_admin_scope(auth.uid())
  OR filled_by = auth.uid()
  OR (
    public.has_role(auth.uid(), 'pharmacist'::app_role)
    AND (pharmacy_id IS NULL OR public.user_affiliated_with_institution(pharmacy_id))
  )
);

-- ---------------------------------------------------------------------
-- P1-8: billing — finance-scoped writes, admin-only deletes
-- ---------------------------------------------------------------------

-- True when the caller is an active institution_staff member of the
-- institution in a finance capacity — by their staff role on that
-- institution's roster, or by holding the billing_staff /
-- finance_manager platform role while on that roster.
CREATE OR REPLACE FUNCTION public.is_institution_finance_staff(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institution_staff s
    WHERE s.institution_id = p_institution_id
      AND s.provider_id = auth.uid()
      AND s.is_active = true
      AND (
        s.role IN ('billing_staff', 'finance_manager')
        OR public.has_role(auth.uid(), 'billing_staff'::app_role)
        OR public.has_role(auth.uid(), 'finance_manager'::app_role)
      )
  );
$$;

-- billing_invoices -----------------------------------------------------

DROP POLICY IF EXISTS "Billing staff can manage invoices" ON public.billing_invoices;
DROP POLICY IF EXISTS "Providers manage institution invoices" ON public.billing_invoices;

CREATE POLICY "Institution staff can view invoices"
ON public.billing_invoices FOR SELECT
TO authenticated
USING (
  public.is_institution_staff_member(institution_id)
  OR public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
);

CREATE POLICY "Finance staff can create invoices"
ON public.billing_invoices FOR INSERT
TO authenticated
WITH CHECK (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
  OR public.is_institution_finance_staff(institution_id)
);

CREATE POLICY "Finance staff can update invoices"
ON public.billing_invoices FOR UPDATE
TO authenticated
USING (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
  OR public.is_institution_finance_staff(institution_id)
)
WITH CHECK (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
  OR public.is_institution_finance_staff(institution_id)
);

CREATE POLICY "Institution admins can delete invoices"
ON public.billing_invoices FOR DELETE
TO authenticated
USING (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
);

-- billing_payments -----------------------------------------------------

DROP POLICY IF EXISTS "Billing staff can manage payments" ON public.billing_payments;

CREATE POLICY "Institution staff can view payments"
ON public.billing_payments FOR SELECT
TO authenticated
USING (
  public.is_institution_staff_member(institution_id)
  OR public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
);

CREATE POLICY "Finance staff can create payments"
ON public.billing_payments FOR INSERT
TO authenticated
WITH CHECK (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
  OR public.is_institution_finance_staff(institution_id)
);

CREATE POLICY "Finance staff can update payments"
ON public.billing_payments FOR UPDATE
TO authenticated
USING (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
  OR public.is_institution_finance_staff(institution_id)
)
WITH CHECK (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
  OR public.is_institution_finance_staff(institution_id)
);

CREATE POLICY "Institution admins can delete payments"
ON public.billing_payments FOR DELETE
TO authenticated
USING (
  public.is_institution_admin(institution_id)
  OR public.has_admin_scope(auth.uid())
);

-- ---------------------------------------------------------------------
-- P1-9: service_pricing — global rows are platform-admin only
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Institution admins manage pricing" ON public.service_pricing;

CREATE POLICY "Institution admins manage pricing"
ON public.service_pricing FOR ALL
TO authenticated
USING (
  (institution_id IS NULL AND public.has_admin_scope(auth.uid()))
  OR (
    institution_id IS NOT NULL
    AND (
      public.is_institution_admin(institution_id)
      OR public.has_admin_scope(auth.uid())
    )
  )
)
WITH CHECK (
  (institution_id IS NULL AND public.has_admin_scope(auth.uid()))
  OR (
    institution_id IS NOT NULL
    AND (
      public.is_institution_admin(institution_id)
      OR public.has_admin_scope(auth.uid())
    )
  )
);

REVOKE ALL ON TABLE public.service_pricing FROM anon;
