-- Fix: pharmacy/lab "Add" flows failed because facility auto-provisioning
-- could never complete.
--
-- Root cause: useInstitutionContext() auto-creates a healthcare_institutions
-- row (admin_id = the user) for pharmacy/lab/clinic roles, but
-- healthcare_institutions has RLS enabled with NO INSERT policy, so the
-- insert always failed. The hook then fell back to an in-memory fake
-- institution whose id (= the user's own id) matches no real row, and every
-- downstream write (medication_inventory, etc.) failed its RLS check with
-- "new row violates row-level security policy".
--
-- Fix: let an authenticated user self-provision exactly one kind of
-- institution row — one they administer (admin_id = auth.uid()) — and let
-- institution managers manage their staff links (covers the
-- institution_staff self-insert the provisioning flow performs, plus admins
-- adding staff later). SELECT on institution_staff covers "my own link" and
-- "staff of institutions I manage".

-- 1. Self-provisioning: a signed-in user may create an institution they administer.
DROP POLICY IF EXISTS "Users can self-provision their own institution"
  ON public.healthcare_institutions;
CREATE POLICY "Users can self-provision their own institution"
  ON public.healthcare_institutions FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- 2. institution_staff reads: own link, or staff of a managed institution.
DROP POLICY IF EXISTS "Users can view own staff link or managed institution staff"
  ON public.institution_staff;
CREATE POLICY "Users can view own staff link or managed institution staff"
  ON public.institution_staff FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.user_manages_institution(institution_id)
  );

-- 3. institution_staff writes: managers of the institution (covers the
-- self-insert during auto-provisioning and admins adding staff).
DROP POLICY IF EXISTS "Institution managers can add staff"
  ON public.institution_staff;
CREATE POLICY "Institution managers can add staff"
  ON public.institution_staff FOR INSERT
  TO authenticated
  WITH CHECK (public.user_manages_institution(institution_id));

DROP POLICY IF EXISTS "Institution managers can update staff"
  ON public.institution_staff;
CREATE POLICY "Institution managers can update staff"
  ON public.institution_staff FOR UPDATE
  TO authenticated
  USING (public.user_manages_institution(institution_id))
  WITH CHECK (public.user_manages_institution(institution_id));

DROP POLICY IF EXISTS "Institution managers can remove staff"
  ON public.institution_staff;
CREATE POLICY "Institution managers can remove staff"
  ON public.institution_staff FOR DELETE
  TO authenticated
  USING (public.user_manages_institution(institution_id));
