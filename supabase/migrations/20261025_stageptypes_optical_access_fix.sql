-- Provider-types sweep 2026-10-25: the optical module locked out the
-- optometrist — the profession that writes eye examinations and optical
-- prescriptions.
--
-- Defect 1: can_manage_optical() granted optical management to
-- super_admin/admin/support/optician and institution admin/staff, but NOT
-- to optometrist. With institution_id NULL (independent practice) every
-- optical_prescriptions / lens_orders write by an optometrist failed RLS.
-- Fix: optometrists manage optical records, alongside opticians.
CREATE OR REPLACE FUNCTION public.can_manage_optical(p_user_id uuid, p_institution_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
      public.has_role(p_user_id, 'super_admin'::app_role)
          OR public.has_role(p_user_id, 'admin'::app_role)
              OR public.has_role(p_user_id, 'support'::app_role)
                  OR public.has_role(p_user_id, 'optician'::app_role)
                      OR public.has_role(p_user_id, 'optometrist'::app_role)
                          OR public.is_institution_admin(p_institution_id)
                              OR public.is_institution_staff_member(p_institution_id)
                              $function$;

-- Defect 2: eye_examinations had exactly one write path — institution
-- staff at the exam's institution. An independent optometrist (the
-- OptometristWorkflow is mounted for independent providers) could never
-- record an examination. Add a provider-own policy mirroring the optical
-- pattern: the exam's own provider may manage it when they hold an
-- optical role; the staff policy is untouched, and patients keep
-- read-own. (Permissive policies OR — this widens only to the record's
-- own provider, gated by can_manage_optical.)
CREATE POLICY "Providers manage own eye examinations"
  ON public.eye_examinations
  FOR ALL
  USING ((provider_id = auth.uid()) AND public.can_manage_optical(auth.uid(), institution_id))
  WITH CHECK ((provider_id = auth.uid()) AND public.can_manage_optical(auth.uid(), institution_id));
