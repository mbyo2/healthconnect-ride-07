-- Fix: pharmacists can see newly created (unassigned) prescriptions
-- ------------------------------------------------------------------
-- The old "Pharmacies can view and update assigned prescriptions" policy only
-- matched rows where pharmacy_id = an institution the user admins. Newly
-- created prescriptions have pharmacy_id = NULL (doctor didn't pick a
-- pharmacy), so pharmacists could never see them — blocking the dispense flow.
--
-- New behavior:
--   1. Pharmacy staff/admins can SELECT prescriptions assigned to their
--      institution (pharmacy_id = their institution id).
--   2. Pharmacy staff/admins can SELECT unassigned prescriptions
--      (pharmacy_id IS NULL) — the network queue they can claim.
--   3. Staff membership is checked via user_roles / institution_staff, not
--      just healthcare_institutions.admin_id.

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Pharmacies can view and update assigned prescriptions" ON public.comprehensive_prescriptions;
DROP POLICY IF EXISTS "Pharmacies can update prescription status" ON public.comprehensive_prescriptions;

-- Helper: is the current user affiliated with the given institution
-- (as admin or staff)? SECURITY DEFINER to avoid RLS recursion.
-- Staff links live in public.institution_staff (institution_id, provider_id).
CREATE OR REPLACE FUNCTION public.user_affiliated_with_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = p_institution_id
      AND hi.admin_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.institution_staff ist
    WHERE ist.institution_id = p_institution_id
      AND ist.provider_id = auth.uid()
      AND ist.is_active = true
  );
$$;

-- SELECT: pharmacy users see assigned + unassigned prescriptions
CREATE POLICY "Pharmacy staff can view assigned and unassigned prescriptions"
ON public.comprehensive_prescriptions
FOR SELECT USING (
  -- Assigned to my institution
  (
    pharmacy_id IS NOT NULL
    AND public.user_affiliated_with_institution(pharmacy_id)
  )
  OR
  -- Unassigned network queue (new prescriptions awaiting a pharmacy)
  (
    pharmacy_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role IN (
          'pharmacy', 'wholesale_pharmacy', 'pharmacist',
          'pharmacy_technologist', 'institution_admin', 'institution_staff',
          'admin'
        )
    )
  )
);

-- UPDATE: pharmacy users can update status of prescriptions they can see
-- (claim unassigned ones by setting pharmacy_id, update fulfillment status).
CREATE POLICY "Pharmacy staff can update visible prescriptions"
ON public.comprehensive_prescriptions
FOR UPDATE USING (
  (
    pharmacy_id IS NOT NULL
    AND public.user_affiliated_with_institution(pharmacy_id)
  )
  OR
  (
    pharmacy_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.role IN (
          'pharmacy', 'wholesale_pharmacy', 'pharmacist',
          'pharmacy_technologist', 'institution_admin', 'institution_staff',
          'admin'
        )
    )
  )
);
