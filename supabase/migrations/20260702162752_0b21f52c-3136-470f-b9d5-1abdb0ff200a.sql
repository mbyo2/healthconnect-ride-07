
-- pharmacy_customers: scope to matching institution/pharmacy
DROP POLICY IF EXISTS "Pharmacy staff can manage own customers" ON public.pharmacy_customers;
DROP POLICY IF EXISTS "Pharmacy staff can update customers" ON public.pharmacy_customers;
DROP POLICY IF EXISTS "Pharmacy staff can delete customers" ON public.pharmacy_customers;
DROP POLICY IF EXISTS "Scoped pharmacy customer access" ON public.pharmacy_customers;

CREATE POLICY "Pharmacy staff insert own pharmacy customers"
  ON public.pharmacy_customers FOR INSERT TO authenticated
  WITH CHECK (
    is_service_role()
    OR EXISTS (
      SELECT 1 FROM institution_staff s
      WHERE s.provider_id = auth.uid()
        AND s.is_active = true
        AND s.institution_id = pharmacy_customers.pharmacy_id
    )
  );

CREATE POLICY "Pharmacy staff update own pharmacy customers"
  ON public.pharmacy_customers FOR UPDATE TO authenticated
  USING (
    is_service_role()
    OR EXISTS (
      SELECT 1 FROM institution_staff s
      WHERE s.provider_id = auth.uid()
        AND s.is_active = true
        AND s.institution_id = pharmacy_customers.pharmacy_id
    )
  );

CREATE POLICY "Pharmacy staff delete own pharmacy customers"
  ON public.pharmacy_customers FOR DELETE TO authenticated
  USING (
    is_service_role()
    OR EXISTS (
      SELECT 1 FROM institution_staff s
      WHERE s.provider_id = auth.uid()
        AND s.is_active = true
        AND s.institution_id = pharmacy_customers.pharmacy_id
    )
  );

-- Note: existing "Pharmacy staff can manage customers" already scopes by institution_id = pharmacy_id (kept).
-- Existing "Patients can view own customer records" and "Admins can view all customers" retained.

-- pos_sales: allow same-pharmacy admins/staff to view sales
CREATE POLICY "Pharmacy admins/staff view pharmacy sales"
  ON public.pos_sales FOR SELECT TO authenticated
  USING (
    is_service_role()
    OR cashier_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM institution_staff s
      WHERE s.provider_id = auth.uid()
        AND s.is_active = true
        AND s.institution_id = pos_sales.pharmacy_id
    )
    OR EXISTS (
      SELECT 1 FROM healthcare_institutions hi
      WHERE hi.id = pos_sales.pharmacy_id
        AND hi.admin_id = auth.uid()
    )
  );

-- hospital_billing_items: patients can view items for their own bills
CREATE POLICY "Patients view own hospital billing items"
  ON public.hospital_billing_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hospital_billing hb
      WHERE hb.id = hospital_billing_items.billing_id
        AND hb.patient_id = auth.uid()
    )
  );

-- login_security_log: replace JWT-email based select with auth.users join
DROP POLICY IF EXISTS "Users can view own login events" ON public.login_security_log;
CREATE POLICY "Users can view own login events"
  ON public.login_security_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) = lower(public.login_security_log.email)
    )
  );
