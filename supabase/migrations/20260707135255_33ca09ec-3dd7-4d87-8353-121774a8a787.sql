
-- 1. patient_doc_folders
DROP POLICY IF EXISTS "Users can manage own folders" ON public.patient_doc_folders;

CREATE POLICY "Patients and care team can view folders"
ON public.patient_doc_folders
FOR SELECT
USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_care_relationship(auth.uid(), patient_id)
);

CREATE POLICY "Patients can insert own folders"
ON public.patient_doc_folders
FOR INSERT
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Patients can update own folders"
ON public.patient_doc_folders
FOR UPDATE
USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Patients can delete own folders"
ON public.patient_doc_folders
FOR DELETE
USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2. login_security_log INSERT: bind email to auth.jwt() email
DROP POLICY IF EXISTS "Users can insert own login events" ON public.login_security_log;
CREATE POLICY "Users can insert own login events"
ON public.login_security_log
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    email IS NULL
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);

-- 3. pharmacy_orders: require active staff
DROP POLICY IF EXISTS "Pharmacy staff can manage orders" ON public.pharmacy_orders;
CREATE POLICY "Pharmacy staff can manage orders"
ON public.pharmacy_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.institution_staff s
    WHERE s.provider_id = auth.uid()
      AND s.institution_id = pharmacy_orders.pharmacy_id
      AND s.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institution_staff s
    WHERE s.provider_id = auth.uid()
      AND s.institution_id = pharmacy_orders.pharmacy_id
      AND s.is_active = true
  )
);

-- 4. pharmacy_order_items
DROP POLICY IF EXISTS "Users can view order items for accessible orders" ON public.pharmacy_order_items;
CREATE POLICY "Users can view order items for accessible orders"
ON public.pharmacy_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pharmacy_orders po
    WHERE po.id = pharmacy_order_items.order_id
      AND (
        EXISTS (
          SELECT 1 FROM public.institution_staff s
          WHERE s.provider_id = auth.uid()
            AND s.institution_id = po.pharmacy_id
            AND s.is_active = true
        )
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

-- 5. supplier_orders
DROP POLICY IF EXISTS "Pharmacy staff can manage supplier orders" ON public.supplier_orders;
CREATE POLICY "Pharmacy staff can manage supplier orders"
ON public.supplier_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.institution_staff s
    WHERE s.provider_id = auth.uid()
      AND s.is_active = true
      AND s.institution_id = (
        SELECT ps.pharmacy_id FROM public.pharmacy_suppliers ps
        WHERE ps.id = supplier_orders.supplier_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institution_staff s
    WHERE s.provider_id = auth.uid()
      AND s.is_active = true
      AND s.institution_id = (
        SELECT ps.pharmacy_id FROM public.pharmacy_suppliers ps
        WHERE ps.id = supplier_orders.supplier_id
      )
  )
);

-- 6. supplier_order_items
DROP POLICY IF EXISTS "Users can view supplier order items for accessible orders" ON public.supplier_order_items;
CREATE POLICY "Users can view supplier order items for accessible orders"
ON public.supplier_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.supplier_orders so
    WHERE so.id = supplier_order_items.order_id
      AND (
        EXISTS (
          SELECT 1 FROM public.institution_staff s
          WHERE s.provider_id = auth.uid()
            AND s.is_active = true
            AND s.institution_id = (
              SELECT ps.pharmacy_id FROM public.pharmacy_suppliers ps
              WHERE ps.id = so.supplier_id
            )
        )
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);
