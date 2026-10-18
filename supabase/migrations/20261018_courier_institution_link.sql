-- Add institution_id to couriers (in addition to pharmacy_id)
-- Institutions can have their own drivers/bikers, not just pharmacies

ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_couriers_institution ON public.couriers(institution_id);

-- Update the verification policy to use institution_id when available
DROP POLICY IF EXISTS "Institution admins manage courier verifications" ON public.courier_verifications;

CREATE POLICY "Institution admins manage courier verifications"
ON public.courier_verifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.id = courier_verifications.courier_id
    AND (
      -- Courier belongs to admin's institution
      (couriers.institution_id IS NOT NULL AND public.is_institution_admin(couriers.institution_id))
      OR
      -- Courier belongs to admin's pharmacy
      (couriers.pharmacy_id IS NOT NULL AND public.is_institution_admin(couriers.pharmacy_id))
      OR
      -- Platform admin
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin'))
    )
  )
);
