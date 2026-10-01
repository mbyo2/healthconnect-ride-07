-- Staff patient registry: allows institution staff to register patients
-- (walk-ins, phone registrations) without requiring the patient to sign up first.
-- When the patient later signs up with the same phone/email, they can be linked.

CREATE TABLE IF NOT EXISTS public.institution_patient_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  registered_by UUID REFERENCES auth.users(id),
  linked_patient_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ipr_institution ON public.institution_patient_registry(institution_id);
CREATE INDEX IF NOT EXISTS idx_ipr_phone ON public.institution_patient_registry(phone);
CREATE INDEX IF NOT EXISTS idx_ipr_email ON public.institution_patient_registry(email);

-- RLS
ALTER TABLE public.institution_patient_registry ENABLE ROW LEVEL SECURITY;

-- Staff can view registry for their institution
CREATE POLICY "Staff view institution patient registry"
  ON public.institution_patient_registry FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_personnel
      WHERE user_id = auth.uid()
    )
    OR
    institution_id IN (
      SELECT id FROM public.healthcare_institutions
      WHERE admin_id = auth.uid()
    )
  );

-- Staff can insert registry entries for their institution
CREATE POLICY "Staff insert institution patient registry"
  ON public.institution_patient_registry FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM public.institution_personnel
      WHERE user_id = auth.uid()
    )
    OR
    institution_id IN (
      SELECT id FROM public.healthcare_institutions
      WHERE admin_id = auth.uid()
    )
  );

-- Staff can update registry entries for their institution
CREATE POLICY "Staff update institution patient registry"
  ON public.institution_patient_registry FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_personnel
      WHERE user_id = auth.uid()
    )
    OR
    institution_id IN (
      SELECT id FROM public.healthcare_institutions
      WHERE admin_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_ipr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ipr_updated_at ON public.institution_patient_registry;
CREATE TRIGGER trg_ipr_updated_at
  BEFORE UPDATE ON public.institution_patient_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_ipr_updated_at();
