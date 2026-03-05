
-- Patient Reviews & Ratings
CREATE TABLE public.provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  is_verified BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,
  provider_response TEXT,
  provider_response_at TIMESTAMPTZ,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(appointment_id)
);

ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can create reviews" ON public.provider_reviews
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Anyone can read visible reviews" ON public.provider_reviews
  FOR SELECT TO authenticated
  USING (is_visible = true);

CREATE POLICY "Patients can update own reviews" ON public.provider_reviews
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Providers can respond to their reviews" ON public.provider_reviews
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Digital Intake Forms
CREATE TABLE public.intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  medical_history JSONB DEFAULT '{}',
  current_medications JSONB DEFAULT '[]',
  allergies JSONB DEFAULT '[]',
  insurance_info JSONB DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',
  consent_signed BOOLEAN DEFAULT false,
  consent_signed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own intake forms" ON public.intake_forms
  FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Providers can view patient intake forms" ON public.intake_forms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = intake_forms.appointment_id
      AND a.provider_id = auth.uid()
    )
  );

-- Provider Analytics: aggregate view
CREATE TABLE public.provider_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_patients INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.provider_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own stats" ON public.provider_statistics
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Public can view provider ratings" ON public.provider_statistics
  FOR SELECT TO authenticated
  USING (true);

-- Function to update provider stats when review is added
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.provider_statistics (provider_id, average_rating, total_reviews)
  VALUES (
    NEW.provider_id,
    NEW.rating,
    1
  )
  ON CONFLICT (provider_id) DO UPDATE SET
    average_rating = (
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM public.provider_reviews
      WHERE provider_id = NEW.provider_id AND is_visible = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.provider_reviews
      WHERE provider_id = NEW.provider_id AND is_visible = true
    ),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON public.provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();
