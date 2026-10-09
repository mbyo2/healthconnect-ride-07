-- Fix institution_devices RLS: remove the dangerously permissive policy and
-- replace with institution-scoped access.
--
-- The live database had a policy named "Allow authenticated device management"
-- with USING (true) / WITH CHECK (true) — any authenticated user could read,
-- insert, update, and delete EVERY institution's devices. This migration drops
-- it (and the older name, if present) and installs a properly scoped policy.

DROP POLICY IF EXISTS "Allow authenticated device management" ON public.institution_devices;
DROP POLICY IF EXISTS "Institution members manage devices" ON public.institution_devices;

CREATE POLICY "Institution members manage devices" ON public.institution_devices
  FOR ALL TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR public.is_service_role()
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.is_institution_staff_member(institution_id)
    OR public.is_service_role()
  );
