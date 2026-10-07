-- 2026-10-07: ICU Management module tables + RLS.
--
-- icu_beds: per-institution ICU bed registry (bed grid).
-- icu_observations: vitals/monitoring charting for ICU patients (GCS, vitals).
-- RLS: institution staff/admins manage; patients view only their own rows.
-- Follows the SECURITY DEFINER helper pattern (no inline cross-table RLS subqueries).

CREATE TABLE IF NOT EXISTS public.icu_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  bed_number text NOT NULL,
  ward_name text NOT NULL DEFAULT 'ICU',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('occupied', 'available', 'maintenance')),
  patient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, bed_number)
);

CREATE TABLE IF NOT EXISTS public.icu_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id uuid NOT NULL REFERENCES public.icu_beds(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  heart_rate integer CHECK (heart_rate IS NULL OR (heart_rate >= 0 AND heart_rate <= 300)),
  bp_systolic integer CHECK (bp_systolic IS NULL OR (bp_systolic >= 0 AND bp_systolic <= 400)),
  bp_diastolic integer CHECK (bp_diastolic IS NULL OR (bp_diastolic >= 0 AND bp_diastolic <= 300)),
  spo2 numeric(5,2) CHECK (spo2 IS NULL OR (spo2 >= 0 AND spo2 <= 100)),
  temperature numeric(4,1) CHECK (temperature IS NULL OR (temperature >= 25 AND temperature <= 45)),
  gcs_score integer CHECK (gcs_score IS NULL OR (gcs_score >= 3 AND gcs_score <= 15)),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icu_beds_institution ON public.icu_beds (institution_id);
CREATE INDEX IF NOT EXISTS idx_icu_beds_patient ON public.icu_beds (patient_id);
CREATE INDEX IF NOT EXISTS idx_icu_obs_bed ON public.icu_observations (bed_id);
CREATE INDEX IF NOT EXISTS idx_icu_obs_patient ON public.icu_observations (patient_id);

ALTER TABLE public.icu_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icu_observations ENABLE ROW LEVEL SECURITY;

-- Opaque staff check (bypasses RLS inside; avoids recursion in policies)
CREATE OR REPLACE FUNCTION public.user_is_institution_staff_for_institution(
  p_viewer_id uuid,
  p_institution_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_personnel ip
    WHERE ip.user_id = p_viewer_id AND ip.institution_id = p_institution_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.healthcare_institutions hi
    WHERE hi.id = p_institution_id AND hi.admin_id = p_viewer_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.institution_staff ist
    WHERE ist.provider_id = p_viewer_id AND ist.institution_id = p_institution_id AND ist.is_active
  );
$$;

-- ── icu_beds policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "ICU staff manage beds" ON public.icu_beds;
CREATE POLICY "ICU staff manage beds"
ON public.icu_beds FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
)
WITH CHECK (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
);

DROP POLICY IF EXISTS "Patients view own ICU bed" ON public.icu_beds;
CREATE POLICY "Patients view own ICU bed"
ON public.icu_beds FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- ── icu_observations policies ─────────────────────────────────────
DROP POLICY IF EXISTS "ICU staff manage observations" ON public.icu_observations;
CREATE POLICY "ICU staff manage observations"
ON public.icu_observations FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), (SELECT ib.institution_id FROM public.icu_beds ib WHERE ib.id = icu_observations.bed_id))
  OR public.has_admin_scope(auth.uid())
)
WITH CHECK (
  public.user_is_institution_staff_for_institution(auth.uid(), (SELECT ib.institution_id FROM public.icu_beds ib WHERE ib.id = icu_observations.bed_id))
  OR public.has_admin_scope(auth.uid())
);

DROP POLICY IF EXISTS "Patients view own ICU observations" ON public.icu_observations;
CREATE POLICY "Patients view own ICU observations"
ON public.icu_observations FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- ── Charter: ICU is now live ──────────────────────────────────────
UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'icu' AND status = 'planned';
