-- Fix: lab Diagnostic Test Catalog was read-only for everyone.
-- lab_test_catalog only had a SELECT policy for authenticated users, so lab
-- managers could never add, price, or retire tests (no "Add Test" worked).
--
-- The catalog is a shared global list (no institution_id): lab-side roles and
-- platform admins can manage it; everyone authenticated can read it.

DROP POLICY IF EXISTS "Lab staff can manage test catalog" ON public.lab_test_catalog;
CREATE POLICY "Lab staff can manage test catalog"
ON public.lab_test_catalog FOR ALL
USING (
  public.has_role(auth.uid(), 'lab')
  OR public.has_role(auth.uid(), 'lab_technician')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'lab')
  OR public.has_role(auth.uid(), 'lab_technician')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);
