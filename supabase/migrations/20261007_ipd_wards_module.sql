-- IPD Wards (Inpatient Ward Management) module
--
-- CONTEXT (2026-10-07): the facility_module_charter lists 'ipd_wards' as
-- 'planned' but the module was never built. This migration creates the
-- ward_beds and ward_transfers tables, marks the charter entry 'live',
-- and adds RLS policies for institution staff + patient self-access.
-- Safe to re-run: all objects are created idempotently.

-- ── Tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ward_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  ward_name text NOT NULL,
  bed_number text NOT NULL,
  bed_type text NOT NULL DEFAULT 'general' CHECK (bed_type IN ('general', 'private', 'semi_private')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('occupied', 'available', 'maintenance')),
  patient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, ward_name, bed_number)
);

CREATE TABLE IF NOT EXISTS public.ward_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_ward text,
  to_ward text NOT NULL,
  from_bed_id uuid REFERENCES public.ward_beds(id) ON DELETE SET NULL,
  to_bed_id uuid REFERENCES public.ward_beds(id) ON DELETE SET NULL,
  transfer_date timestamptz NOT NULL DEFAULT now(),
  reason text,
  transferred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Enable RLS ─────────────────────────────────────────────────

ALTER TABLE public.ward_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ward_transfers ENABLE ROW LEVEL SECURITY;

-- ── RLS: ward_beds ─────────────────────────────────────────────

-- Institution staff (active staff link or admin_id holder) see their institution's beds
DROP POLICY IF EXISTS "Institution staff view ward beds" ON public.ward_beds;
CREATE POLICY "Institution staff view ward beds"
  ON public.ward_beds FOR SELECT TO authenticated
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
  );

-- Patients view beds they occupy
DROP POLICY IF EXISTS "Patients view own ward bed" ON public.ward_beds;
CREATE POLICY "Patients view own ward bed"
  ON public.ward_beds FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Institution staff manage beds
DROP POLICY IF EXISTS "Institution staff manage ward beds" ON public.ward_beds;
CREATE POLICY "Institution staff manage ward beds"
  ON public.ward_beds FOR ALL TO authenticated
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

-- ── RLS: ward_transfers ────────────────────────────────────────

DROP POLICY IF EXISTS "Institution staff view ward transfers" ON public.ward_transfers;
CREATE POLICY "Institution staff view ward transfers"
  ON public.ward_transfers FOR SELECT TO authenticated
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
  );

DROP POLICY IF EXISTS "Patients view own ward transfers" ON public.ward_transfers;
CREATE POLICY "Patients view own ward transfers"
  ON public.ward_transfers FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Institution staff manage ward transfers" ON public.ward_transfers;
CREATE POLICY "Institution staff manage ward transfers"
  ON public.ward_transfers FOR ALL TO authenticated
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

-- ── Mark charter entry live ────────────────────────────────────

UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'ipd_wards' AND status = 'planned';
