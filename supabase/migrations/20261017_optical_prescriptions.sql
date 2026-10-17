-- ============================================================================
-- Optical prescriptions + lens orders (optician workflow).
--
-- An optician dispenses glasses/contacts from prescriptions (different
-- from the optometrist, who performs eye exams). This migration adds:
--   0. 'optician' value to the app_role enum (the role exists in the
--      workflow router but was never added to the enum).
--   1. public.optical_prescriptions — the prescription itself (OD/OS
--      sphere/cylinder/axis, pupillary distance, notes, status).
--   2. public.lens_orders — fulfillment tracking for frames + lenses
--      (status: pending → ordered → ready → dispensed).
--
-- SECURITY MODEL (follows AGENTS.md RLS rules):
--  - All cross-table role checks go through the SECURITY DEFINER helper
--    public.has_role — never inline EXISTS in policies.
--  - Institution staff (incl. optician) can manage rows for their own
--    institution; platform admin/super_admin/support can manage all.
--  - No DELETE — history is the audit trail.
-- ============================================================================

-- 0. Register the optician role in the enum (additive, safe).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'optician';

-- 1. Optical prescriptions
CREATE TABLE IF NOT EXISTS public.optical_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescribed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  od_sphere NUMERIC,
  od_cylinder NUMERIC,
  od_axis INTEGER CHECK (od_axis IS NULL OR (od_axis >= 0 AND od_axis <= 180)),
  os_sphere NUMERIC,
  os_cylinder NUMERIC,
  os_axis INTEGER CHECK (os_axis IS NULL OR (os_axis >= 0 AND os_axis <= 180)),
  pd NUMERIC,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.optical_prescriptions.pd IS 'Pupillary distance in mm';

CREATE INDEX IF NOT EXISTS idx_optical_rx_patient ON public.optical_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_optical_rx_institution ON public.optical_prescriptions(institution_id);
CREATE INDEX IF NOT EXISTS idx_optical_rx_status ON public.optical_prescriptions(status);

ALTER TABLE public.optical_prescriptions ENABLE ROW LEVEL SECURITY;

-- Helper: caller is institution staff of the row's institution, or a
-- platform role. (SECURITY DEFINER — opaque to the RLS rewriter.)
CREATE OR REPLACE FUNCTION public.can_manage_optical(p_user_id UUID, p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(p_user_id, 'super_admin'::app_role)
    OR public.has_role(p_user_id, 'admin'::app_role)
    OR public.has_role(p_user_id, 'support'::app_role)
    OR public.has_role(p_user_id, 'optician'::app_role)
    OR public.is_institution_admin(p_institution_id, p_user_id)
    OR public.is_institution_staff_member(p_institution_id, p_user_id)
$$;

DROP POLICY IF EXISTS "Optical staff manage prescriptions" ON public.optical_prescriptions;
CREATE POLICY "Optical staff manage prescriptions"
ON public.optical_prescriptions FOR ALL TO authenticated
USING (public.can_manage_optical(auth.uid(), institution_id))
WITH CHECK (public.can_manage_optical(auth.uid(), institution_id));

-- Patients can read their own prescriptions.
DROP POLICY IF EXISTS "Patients read own optical prescriptions" ON public.optical_prescriptions;
CREATE POLICY "Patients read own optical prescriptions"
ON public.optical_prescriptions FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- 2. Lens orders
CREATE TABLE IF NOT EXISTS public.lens_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.optical_prescriptions(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name TEXT,
  frame TEXT,
  lens_type TEXT CHECK (lens_type IS NULL OR lens_type IN ('single_vision', 'bifocal', 'progressive', 'contact_lenses', 'sunglasses')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ordered', 'ready', 'dispensed', 'cancelled')),
  ordered_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  dispensed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lens_orders_patient ON public.lens_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lens_orders_institution ON public.lens_orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_lens_orders_status ON public.lens_orders(status);
CREATE INDEX IF NOT EXISTS idx_lens_orders_rx ON public.lens_orders(prescription_id);

ALTER TABLE public.lens_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Optical staff manage lens orders" ON public.lens_orders;
CREATE POLICY "Optical staff manage lens orders"
ON public.lens_orders FOR ALL TO authenticated
USING (public.can_manage_optical(auth.uid(), institution_id))
WITH CHECK (public.can_manage_optical(auth.uid(), institution_id));

DROP POLICY IF EXISTS "Patients read own lens orders" ON public.lens_orders;
CREATE POLICY "Patients read own lens orders"
ON public.lens_orders FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- Updated-at triggers
CREATE OR REPLACE FUNCTION public.touch_optical_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_optical_rx_touch ON public.optical_prescriptions;
CREATE TRIGGER trg_optical_rx_touch
BEFORE UPDATE ON public.optical_prescriptions
FOR EACH ROW EXECUTE FUNCTION public.touch_optical_updated_at();

DROP TRIGGER IF EXISTS trg_lens_orders_touch ON public.lens_orders;
CREATE TRIGGER trg_lens_orders_touch
BEFORE UPDATE ON public.lens_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_optical_updated_at();
