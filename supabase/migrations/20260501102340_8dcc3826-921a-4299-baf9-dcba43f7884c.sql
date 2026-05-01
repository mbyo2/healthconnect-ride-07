
-- Insurance cards table
CREATE TABLE IF NOT EXISTS public.insurance_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  ocr_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own insurance cards"
  ON public.insurance_cards FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients insert own insurance cards"
  ON public.insurance_cards FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients update own insurance cards"
  ON public.insurance_cards FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Patients delete own insurance cards"
  ON public.insurance_cards FOR DELETE USING (auth.uid() = patient_id);

CREATE TRIGGER update_insurance_cards_updated_at
  BEFORE UPDATE ON public.insurance_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Appointment waitlist table
CREATE TABLE IF NOT EXISTS public.appointment_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  preferred_date_start DATE,
  preferred_date_end DATE,
  preferred_time_start TEXT,
  preferred_time_end TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own waitlist"
  ON public.appointment_waitlist FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Providers view their waitlist"
  ON public.appointment_waitlist FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Patients join waitlist"
  ON public.appointment_waitlist FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients update own waitlist"
  ON public.appointment_waitlist FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Providers update their waitlist"
  ON public.appointment_waitlist FOR UPDATE USING (auth.uid() = provider_id);

CREATE POLICY "Patients delete own waitlist"
  ON public.appointment_waitlist FOR DELETE USING (auth.uid() = patient_id);

CREATE TRIGGER update_appointment_waitlist_updated_at
  BEFORE UPDATE ON public.appointment_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_waitlist_provider_status ON public.appointment_waitlist(provider_id, status);
CREATE INDEX idx_waitlist_patient ON public.appointment_waitlist(patient_id);

-- Insurance cards storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance_cards', 'insurance_cards', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own insurance card images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own insurance card images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own insurance card images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'insurance_cards' AND auth.uid()::text = (storage.foldername(name))[1]);
