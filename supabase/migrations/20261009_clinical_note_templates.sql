-- Clinical note templates (Epic SmartPhrases-style)
-- Reusable documentation shortcuts, e.g. ".ros" expands to a Review of Systems template.
-- Placeholders: {{patient_name}}, {{date}}, {{provider_name}}, {{dob}}, {{age}}

CREATE TABLE IF NOT EXISTS public.clinical_note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut text NOT NULL CHECK (shortcut ~ '^\.[a-z0-9_]{2,30}$'),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','soap','review_of_systems','physical_exam','discharge','procedure','nursing','allied')),
  is_shared boolean NOT NULL DEFAULT false,
  institution_id uuid,
  created_by uuid NOT NULL,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shortcut, created_by)
);

ALTER TABLE public.clinical_note_templates ENABLE ROW LEVEL SECURITY;

-- Clinicians manage their own templates
DROP POLICY IF EXISTS "Clinicians manage own note templates" ON public.clinical_note_templates;
CREATE POLICY "Clinicians manage own note templates"
  ON public.clinical_note_templates FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Shared templates visible to clinical staff in the same institution (or global shared)
DROP POLICY IF EXISTS "Staff view shared note templates" ON public.clinical_note_templates;
CREATE POLICY "Staff view shared note templates"
  ON public.clinical_note_templates FOR SELECT
  USING (
    is_shared = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role <> 'patient'
    )
  );

-- Admins manage all
DROP POLICY IF EXISTS "Admins manage all note templates" ON public.clinical_note_templates;
CREATE POLICY "Admins manage all note templates"
  ON public.clinical_note_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin','admin')
    )
  );

-- Increment use_count via function (avoids direct UPDATE policy needs)
CREATE OR REPLACE FUNCTION public.increment_template_use(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.clinical_note_templates
  SET use_count = use_count + 1, updated_at = now()
  WHERE id = p_template_id;
END;
$function$;

-- Seed: useful default templates (created_by = system placeholder, shared)
-- Note: created_by must be a real uuid for FK-less column; use 00000000-... as system
INSERT INTO public.clinical_note_templates (shortcut, title, content, category, is_shared, created_by)
VALUES
  ('.soap', 'SOAP Note', 'S: {{patient_name}} presents on {{date}} with...\n\nO:\nVitals: \nExam: \n\nA: \n\nP: ', 'soap', true, '00000000-0000-0000-0000-000000000000'),
  ('.ros', 'Review of Systems', 'ROS: Denies fever, chills, chest pain, SOB, nausea, vomiting, diarrhea, dysuria, headache, dizziness. Reports: ', 'review_of_systems', true, '00000000-0000-0000-0000-000000000000'),
  ('.pe', 'Physical Exam', 'PE:\nGen: \nHEENT: \nCVS: \nResp: \nAbd: \nNeuro: \nSkin: ', 'physical_exam', true, '00000000-0000-0000-0000-000000000000'),
  ('.discharge', 'Discharge Summary', 'Discharge Summary — {{patient_name}} ({{date}})\n\nAdmission diagnosis: \nHospital course: \nDischarge diagnosis: \nDischarge medications: \nFollow-up: ', 'discharge', true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (shortcut, created_by) DO NOTHING;

COMMENT ON TABLE public.clinical_note_templates IS
  'Epic SmartPhrases-style clinical note templates with .shortcut expansion and {{placeholders}}.';
