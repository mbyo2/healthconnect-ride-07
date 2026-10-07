-- 2026-10-07: Teaching & Research module for teaching hospitals.
-- Tables: teaching_rotations, research_studies, case_discussions.
-- RLS: institution staff manage; no patient PII in these tables (student names
-- are staff-education records, not patient data).
-- Also marks facility_module_charter teaching_research as live.

-- ── teaching_rotations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teaching_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_id_number text,
  university text,
  department text NOT NULL DEFAULT 'General',
  start_date date NOT NULL,
  end_date date,
  supervisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teaching_rotations_inst ON public.teaching_rotations(institution_id);

ALTER TABLE public.teaching_rotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage rotations" ON public.teaching_rotations;
CREATE POLICY "Staff manage rotations"
ON public.teaching_rotations FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
);

-- ── research_studies ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.research_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  principal_investigator text,
  study_type text NOT NULL DEFAULT 'observational'
    CHECK (study_type IN ('clinical_trial','observational','case_study')),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','approved','ongoing','completed','published')),
  start_date date,
  end_date date,
  ethics_approval_number text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_studies_inst ON public.research_studies(institution_id);

ALTER TABLE public.research_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage studies" ON public.research_studies;
CREATE POLICY "Staff manage studies"
ON public.research_studies FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
);

-- ── case_discussions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.case_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  presenter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  discussion_date date NOT NULL DEFAULT CURRENT_DATE,
  department text NOT NULL DEFAULT 'General',
  case_summary text,
  learning_points text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_discussions_inst ON public.case_discussions(institution_id);

ALTER TABLE public.case_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage discussions" ON public.case_discussions;
CREATE POLICY "Staff manage discussions"
ON public.case_discussions FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
);

-- ── Charter: teaching & research is now live ────────────────────────
UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'teaching_research';
