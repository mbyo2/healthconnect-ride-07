
-- Fix permissive RLS on pharmacy_customers
DROP POLICY IF EXISTS "Pharmacy staff can manage customers" ON pharmacy_customers;
CREATE POLICY "Pharmacy staff can read customers" ON pharmacy_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacy staff can manage own customers" ON pharmacy_customers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM institution_staff WHERE provider_id = auth.uid() AND is_active = true)
  OR public.is_service_role()
);
CREATE POLICY "Pharmacy staff can update customers" ON pharmacy_customers FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM institution_staff WHERE provider_id = auth.uid() AND is_active = true)
  OR public.is_service_role()
);
CREATE POLICY "Pharmacy staff can delete customers" ON pharmacy_customers FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM institution_staff WHERE provider_id = auth.uid() AND is_active = true)
  OR public.is_service_role()
);
