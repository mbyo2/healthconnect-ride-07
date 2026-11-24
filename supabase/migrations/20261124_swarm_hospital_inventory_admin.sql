-- Swarm 2026-11-24 — hospital_inventory: institution admins can manage their
-- own institution's stock. The pre-existing policies gate on
-- is_institution_staff_member only, and the institution's admin (admin_id) is
-- not automatically a staff member — so the person who runs the hospital could
-- not create stock items, while the movement RPC already accepts admins.
-- Permissive policy, own-institution only (least privilege preserved).
CREATE POLICY "Institution admins can manage inventory" ON public.hospital_inventory
  FOR ALL TO authenticated
  USING (public.is_institution_admin(institution_id))
  WITH CHECK (public.is_institution_admin(institution_id));
