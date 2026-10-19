-- Patient favorite/saved providers (Zocdoc parity)
-- Allows patients to save providers for quick rebooking
-- Date: 2026-10-19

CREATE TABLE IF NOT EXISTS public.favorite_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(patient_id, provider_id)
);

-- RLS: patients manage own favorites
ALTER TABLE public.favorite_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own favorites"
  ON public.favorite_providers
  FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_favorite_providers_patient 
  ON public.favorite_providers(patient_id);
CREATE INDEX IF NOT EXISTS idx_favorite_providers_provider 
  ON public.favorite_providers(provider_id);
