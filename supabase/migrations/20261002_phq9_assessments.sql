-- PHQ-9 depression assessments with durable self-harm risk flag.
--
-- Safety-critical: the psychologist workflow previously saved PHQ-9 scores
-- only as a frontend toast. A Q9 > 0 (self-harm/suicidal ideation) signal
-- must be persisted with patient identity, clinician identity, institution,
-- item-level scores, timestamp, and crisis-acknowledgment audit trail.
--
-- Follows the triage_assessments pattern: institution_id + patient_id
-- (auth.users id; there is no public.patients table) + assessed_by style
-- columns, guarded by is_institution_staff / is_institution_admin helpers.

CREATE TABLE IF NOT EXISTS public.phq9_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid, -- nullable: independent psychologists may have none
  patient_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  q1 smallint NOT NULL DEFAULT 0 CHECK (q1 BETWEEN 0 AND 3),
  q2 smallint NOT NULL DEFAULT 0 CHECK (q2 BETWEEN 0 AND 3),
  q3 smallint NOT NULL DEFAULT 0 CHECK (q3 BETWEEN 0 AND 3),
  q4 smallint NOT NULL DEFAULT 0 CHECK (q4 BETWEEN 0 AND 3),
  q5 smallint NOT NULL DEFAULT 0 CHECK (q5 BETWEEN 0 AND 3),
  q6 smallint NOT NULL DEFAULT 0 CHECK (q6 BETWEEN 0 AND 3),
  q7 smallint NOT NULL DEFAULT 0 CHECK (q7 BETWEEN 0 AND 3),
  q8 smallint NOT NULL DEFAULT 0 CHECK (q8 BETWEEN 0 AND 3),
  q9 smallint NOT NULL DEFAULT 0 CHECK (q9 BETWEEN 0 AND 3),
  total_score smallint GENERATED ALWAYS AS (q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8 + q9) STORED,
  severity text NOT NULL DEFAULT 'Minimal'
    CHECK (severity IN ('Minimal', 'Mild', 'Moderate', 'Moderately Severe', 'Severe')),
  self_harm_risk boolean NOT NULL DEFAULT false,
  crisis_acknowledged boolean NOT NULL DEFAULT false,
  crisis_acknowledged_at timestamptz,
  notes text,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phq9_patient_assessed
  ON public.phq9_assessments (patient_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_phq9_institution
  ON public.phq9_assessments (institution_id);
CREATE INDEX IF NOT EXISTS idx_phq9_self_harm
  ON public.phq9_assessments (institution_id, self_harm_risk)
  WHERE self_harm_risk = true;

ALTER TABLE public.phq9_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution staff can manage phq9 assessments" ON public.phq9_assessments;
CREATE POLICY "Institution staff can manage phq9 assessments"
  ON public.phq9_assessments
  FOR ALL
  USING (is_institution_staff(institution_id, auth.uid()) OR is_institution_admin(institution_id));

DROP POLICY IF EXISTS "Patients can read own phq9 assessments" ON public.phq9_assessments;
CREATE POLICY "Patients can read own phq9 assessments"
  ON public.phq9_assessments
  FOR SELECT
  USING (patient_id = auth.uid());

-- Independent clinicians (no institution) can still record their own assessments.
DROP POLICY IF EXISTS "Clinicians can manage own phq9 assessments" ON public.phq9_assessments;
CREATE POLICY "Clinicians can manage own phq9 assessments"
  ON public.phq9_assessments
  FOR ALL
  USING (clinician_id = auth.uid());
