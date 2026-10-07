-- 2026-10-07: Maternal & Child Health module (high-priority for Zambia).
-- Tables: anc_visits, deliveries, immunizations.
-- RLS: institution staff/admins manage; patients view their own rows.

-- ── anc_visits ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.anc_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_number integer NOT NULL DEFAULT 1,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  gestational_age_weeks numeric(5,2),
  weight_kg numeric(5,2),
  bp_systolic integer,
  bp_diastolic integer,
  hemoglobin numeric(4,2),
  urine_protein text,
  fetal_heart_rate integer,
  notes text,
  next_visit_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anc_visits_patient ON public.anc_visits(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_anc_visits_institution ON public.anc_visits(institution_id, visit_date DESC);

-- ── deliveries ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_type text NOT NULL DEFAULT 'normal' CHECK (delivery_type IN ('normal', 'caesarean', 'assisted')),
  birth_weight_kg numeric(4,2),
  baby_gender text CHECK (baby_gender IN ('male', 'female', 'other')),
  apgar_score integer CHECK (apgar_score BETWEEN 0 AND 10),
  complications text,
  attended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_patient ON public.deliveries(patient_id, delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_institution ON public.deliveries(institution_id, delivery_date DESC);

-- ── immunizations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.immunizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  dose_number integer NOT NULL DEFAULT 1,
  scheduled_date date NOT NULL,
  administered_date date,
  administered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_immunizations_patient ON public.immunizations(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_immunizations_institution ON public.immunizations(institution_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_immunizations_due ON public.immunizations(scheduled_date) WHERE administered_date IS NULL;

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.anc_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immunizations ENABLE ROW LEVEL SECURITY;

-- Helper: staff or admin of the row's institution (inline subqueries, no
-- cross-table recursion risk since these tables are not referenced by
-- any profiles policy).
CREATE OR REPLACE FUNCTION public.user_manages_mch_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.institution_staff s
      WHERE s.institution_id = p_institution_id
        AND s.provider_id = auth.uid()
        AND s.is_active
    )
    OR EXISTS (
      SELECT 1 FROM public.healthcare_institutions hi
      WHERE hi.id = p_institution_id
        AND hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid());
$$;

-- anc_visits policies
DROP POLICY IF EXISTS "MCH staff manage anc visits" ON public.anc_visits;
CREATE POLICY "MCH staff manage anc visits"
  ON public.anc_visits FOR ALL TO authenticated
  USING (public.user_manages_mch_institution(institution_id))
  WITH CHECK (public.user_manages_mch_institution(institution_id));

DROP POLICY IF EXISTS "Patients view own anc visits" ON public.anc_visits;
CREATE POLICY "Patients view own anc visits"
  ON public.anc_visits FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- deliveries policies
DROP POLICY IF EXISTS "MCH staff manage deliveries" ON public.deliveries;
CREATE POLICY "MCH staff manage deliveries"
  ON public.deliveries FOR ALL TO authenticated
  USING (public.user_manages_mch_institution(institution_id))
  WITH CHECK (public.user_manages_mch_institution(institution_id));

DROP POLICY IF EXISTS "Patients view own deliveries" ON public.deliveries;
CREATE POLICY "Patients view own deliveries"
  ON public.deliveries FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- immunizations policies
DROP POLICY IF EXISTS "MCH staff manage immunizations" ON public.immunizations;
CREATE POLICY "MCH staff manage immunizations"
  ON public.immunizations FOR ALL TO authenticated
  USING (public.user_manages_mch_institution(institution_id))
  WITH CHECK (public.user_manages_mch_institution(institution_id));

DROP POLICY IF EXISTS "Patients view own immunizations" ON public.immunizations;
CREATE POLICY "Patients view own immunizations"
  ON public.immunizations FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- ── Charter: maternal_child goes live (seeded for primary/secondary/tertiary tiers) ──
UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'maternal_child' AND status = 'planned';
