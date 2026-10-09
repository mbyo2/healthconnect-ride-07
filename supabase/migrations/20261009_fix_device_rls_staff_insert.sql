-- Fix institution_devices RLS: allow staff members to insert devices, not just admins
-- The USING clause allowed staff to read, but WITH CHECK blocked staff inserts

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
