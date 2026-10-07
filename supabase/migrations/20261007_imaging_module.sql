-- Imaging / Radiology module tables
--
-- CONTEXT (2026-10-07): the standalone /imaging module (Imaging component)
-- needs its own order + result tables. A legacy radiology_requests table is
-- used by the hospital-embedded RadiologyImaging component; this module uses
-- the new imaging_orders / imaging_results tables with institution scoping
-- and patient-visible results.

-- ── imaging_orders ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.imaging_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  modality text NOT NULL CHECK (modality IN ('xray','ct','mri','ultrasound','mammography')),
  body_part text NOT NULL,
  clinical_indication text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','emergency')),
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','in_progress','completed','cancelled')),
  order_number text,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imaging_orders ENABLE ROW LEVEL SECURITY;

-- Institution staff (admin or active staff) manage orders for their institution
DROP POLICY IF EXISTS "Institution staff manage imaging orders" ON public.imaging_orders;
CREATE POLICY "Institution staff manage imaging orders"
  ON public.imaging_orders FOR ALL TO authenticated
  USING (
    institution_id IN (
      SELECT s.institution_id FROM public.institution_staff s
      WHERE s.provider_id = auth.uid() AND s.is_active
    )
    OR institution_id IN (
      SELECT hi.id FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  )
  WITH CHECK (
    institution_id IN (
      SELECT s.institution_id FROM public.institution_staff s
      WHERE s.provider_id = auth.uid() AND s.is_active
    )
    OR institution_id IN (
      SELECT hi.id FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  );

-- Patients view their own orders
DROP POLICY IF EXISTS "Patients view own imaging orders" ON public.imaging_orders;
CREATE POLICY "Patients view own imaging orders"
  ON public.imaging_orders FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- ── imaging_results ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.imaging_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.imaging_orders(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  radiologist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  findings text NOT NULL DEFAULT '',
  impression text NOT NULL DEFAULT '',
  image_url text,
  reported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imaging_results ENABLE ROW LEVEL SECURITY;

-- Institution staff manage results for their institution's orders
DROP POLICY IF EXISTS "Institution staff manage imaging results" ON public.imaging_results;
CREATE POLICY "Institution staff manage imaging results"
  ON public.imaging_results FOR ALL TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.imaging_orders o
      WHERE o.institution_id IN (
        SELECT s.institution_id FROM public.institution_staff s
        WHERE s.provider_id = auth.uid() AND s.is_active
      )
      OR o.institution_id IN (
        SELECT hi.id FROM public.healthcare_institutions hi
        WHERE hi.admin_id = auth.uid()
      )
    )
    OR public.has_admin_scope(auth.uid())
  )
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.imaging_orders o
      WHERE o.institution_id IN (
        SELECT s.institution_id FROM public.institution_staff s
        WHERE s.provider_id = auth.uid() AND s.is_active
      )
      OR o.institution_id IN (
        SELECT hi.id FROM public.healthcare_institutions hi
        WHERE hi.admin_id = auth.uid()
      )
    )
    OR public.has_admin_scope(auth.uid())
  );

-- Patients view their own results
DROP POLICY IF EXISTS "Patients view own imaging results" ON public.imaging_results;
CREATE POLICY "Patients view own imaging results"
  ON public.imaging_results FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- ── facility_module_charter: imaging goes live ────────────────
UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'imaging' AND status = 'planned';
