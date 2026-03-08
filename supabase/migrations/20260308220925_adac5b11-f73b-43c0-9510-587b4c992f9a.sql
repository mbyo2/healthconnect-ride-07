
-- OT Surgeries table
CREATE TABLE public.ot_surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_id UUID REFERENCES public.profiles(id),
  procedure_name TEXT NOT NULL,
  ot_room TEXT NOT NULL DEFAULT 'OT-1',
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  surgeon_name TEXT NOT NULL,
  surgeon_id UUID REFERENCES public.profiles(id),
  anaesthesia_type TEXT NOT NULL DEFAULT 'general',
  consent_signed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ot_surgeries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view ot_surgeries"
  ON public.ot_surgeries FOR SELECT TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff can insert ot_surgeries"
  ON public.ot_surgeries FOR INSERT TO authenticated
  WITH CHECK (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE POLICY "Institution staff can update ot_surgeries"
  ON public.ot_surgeries FOR UPDATE TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

-- Sample Collections table
CREATE TABLE public.sample_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_id UUID REFERENCES public.profiles(id),
  sample_type TEXT NOT NULL DEFAULT 'blood',
  barcode TEXT NOT NULL,
  collection_type TEXT NOT NULL DEFAULT 'in_lab' CHECK (collection_type IN ('in_lab', 'home_visit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'in_transit', 'received')),
  address TEXT,
  scheduled_time TIME,
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sample_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Phlebotomists can view sample_collections"
  ON public.sample_collections FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR collected_by = auth.uid()
    OR (institution_id IS NOT NULL AND (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id)))
  );

CREATE POLICY "Phlebotomists can insert sample_collections"
  ON public.sample_collections FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Phlebotomists can update sample_collections"
  ON public.sample_collections FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() 
    OR collected_by = auth.uid()
    OR (institution_id IS NOT NULL AND (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id)))
  );
