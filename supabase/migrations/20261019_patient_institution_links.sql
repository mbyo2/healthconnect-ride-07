-- Patient-Institution Links: patients can be associated with multiple institutions
-- with restricted permissions (portal access, not clinical admin)

CREATE TABLE IF NOT EXISTS public.patient_institution_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'discharged')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_institution_links_patient 
  ON public.patient_institution_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_institution_links_institution 
  ON public.patient_institution_links(institution_id);
CREATE INDEX IF NOT EXISTS idx_patient_institution_links_status 
  ON public.patient_institution_links(status);

-- Enable RLS
ALTER TABLE public.patient_institution_links ENABLE ROW LEVEL SECURITY;

-- Patients can see their own links
CREATE POLICY "Patients view own institution links"
  ON public.patient_institution_links FOR SELECT
  USING (auth.uid() = patient_id);

-- Institution staff can see links for their institution
CREATE POLICY "Staff view institution patient links"
  ON public.patient_institution_links FOR SELECT
  USING (
    institution_id = ANY(public.user_institution_ids())
    OR public.is_institution_admin(institution_id)
  );

-- Institution admins can manage links
CREATE POLICY "Admins manage patient institution links"
  ON public.patient_institution_links FOR ALL
  USING (public.is_institution_admin(institution_id))
  WITH CHECK (public.is_institution_admin(institution_id));

-- Patients can request to link (insert own link as pending)
CREATE POLICY "Patients can request institution link"
  ON public.patient_institution_links FOR INSERT
  WITH CHECK (auth.uid() = patient_id AND status = 'active');
