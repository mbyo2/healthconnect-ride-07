-- Fix: pharmacy "Add Medication" failed with
--   "new row violates row-level security policy for table medication_inventory"
--
-- The medication_inventory table was created outside the migration history with
-- RLS enabled but no usable INSERT/UPDATE/DELETE policies for the pharmacy
-- workflow, so no pharmacy could ever stock its own shelves.
--
-- This defines the pharmacy stock workflow in RLS: the institution admin
-- (healthcare_institutions.admin_id) and active staff linked through
-- institution_staff / pharmacy_staff / institution_personnel can fully manage
-- (select/insert/update/delete) the inventory rows of their own institution.
-- Platform admins keep read access for support.

-- Helper: does the current user manage this institution?
CREATE OR REPLACE FUNCTION public.user_manages_institution(inst_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.healthcare_institutions
      WHERE id = inst_id AND admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.institution_staff
      WHERE institution_id = inst_id AND provider_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.pharmacy_staff
      WHERE pharmacy_id = inst_id AND user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.institution_personnel
      WHERE institution_id = inst_id AND user_id = auth.uid() AND status = 'active'
    );
$$;

ALTER TABLE public.medication_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution managers can view inventory" ON public.medication_inventory;
CREATE POLICY "Institution managers can view inventory"
ON public.medication_inventory FOR SELECT
USING (
  public.user_manages_institution(institution_id)
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Institution managers can add inventory" ON public.medication_inventory;
CREATE POLICY "Institution managers can add inventory"
ON public.medication_inventory FOR INSERT
WITH CHECK (public.user_manages_institution(institution_id));

DROP POLICY IF EXISTS "Institution managers can update inventory" ON public.medication_inventory;
CREATE POLICY "Institution managers can update inventory"
ON public.medication_inventory FOR UPDATE
USING (public.user_manages_institution(institution_id))
WITH CHECK (public.user_manages_institution(institution_id));

DROP POLICY IF EXISTS "Institution managers can delete inventory" ON public.medication_inventory;
CREATE POLICY "Institution managers can delete inventory"
ON public.medication_inventory FOR DELETE
USING (public.user_manages_institution(institution_id));
