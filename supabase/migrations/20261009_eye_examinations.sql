-- Eye examinations table for optometrist workflow
-- Stores refraction, visual acuity, IOP, and clinical notes per patient

CREATE TABLE IF NOT EXISTS public.eye_examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.healthcare_institutions(id),
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  -- Right eye (OD)
  od_sphere TEXT,
  od_cylinder TEXT,
  od_axis TEXT,
  od_visual_acuity TEXT,
  od_iop TEXT,
  -- Left eye (OS)
  os_sphere TEXT,
  os_cylinder TEXT,
  os_axis TEXT,
  os_visual_acuity TEXT,
  os_iop TEXT,
  -- Clinical notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.eye_examinations ENABLE ROW LEVEL SECURITY;

-- Providers can manage eye exams at their institution
CREATE POLICY "Staff manage eye examinations"
  ON public.eye_examinations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_staff s
      WHERE s.provider_id = auth.uid()
      AND s.institution_id = eye_examinations.institution_id
      AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.institution_staff s
      WHERE s.provider_id = auth.uid()
      AND s.institution_id = eye_examinations.institution_id
      AND s.is_active = true
    )
  );

-- Patients can view their own eye exams
CREATE POLICY "Patients view own eye examinations"
  ON public.eye_examinations
  FOR SELECT
  USING (patient_id = auth.uid());

-- Index for patient lookups
CREATE INDEX IF NOT EXISTS idx_eye_examinations_patient
  ON public.eye_examinations(patient_id);
CREATE INDEX IF NOT EXISTS idx_eye_examinations_institution
  ON public.eye_examinations(institution_id);
