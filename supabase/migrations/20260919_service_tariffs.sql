-- ============================================================================
-- Service tariff master (per-institution charge book)
-- Powers the HMS Tariff Rates tab and feeds HospitalBilling charge lookup,
-- replacing hardcoded fallback fees with each facility's own approved rates.
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_tariffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'opd'
    CHECK (category IN ('opd', 'lab', 'radiology', 'dental', 'surgery', 'pharmacy', 'ward', 'emergency', 'other')),
  department text,
  base_price numeric NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  cost_price numeric NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  insurance_price numeric,
  currency text NOT NULL DEFAULT 'ZMW',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_tariffs_pkey PRIMARY KEY (id),
  CONSTRAINT service_tariffs_institution_code_unique UNIQUE (institution_id, code)
);

-- Touch updated_at on edits
CREATE OR REPLACE FUNCTION public.touch_service_tariffs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_tariffs_updated_at ON public.service_tariffs;
CREATE TRIGGER trg_service_tariffs_updated_at
  BEFORE UPDATE ON public.service_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.touch_service_tariffs_updated_at();

-- Platform video-consultation prices (ZMW). Both the DPO and wallet rails
-- resolve checkout amounts against these rows — bookings fail without them.
INSERT INTO public.service_pricing (institution_id, service_code, service_label, base_price, currency, category, is_active)
SELECT NULL, v.code, v.label, v.price, 'ZMW', 'video_consultation', true
FROM (VALUES
  ('video_consultation_general', 'General Consultation', 50),
  ('video_consultation_follow-up', 'Follow-up Visit', 30),
  ('video_consultation_specialist', 'Specialist Consultation', 80),
  ('video_consultation_emergency', 'Emergency Consultation', 100)
) AS v(code, label, price)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_pricing sp
  WHERE sp.service_code = v.code AND sp.institution_id IS NULL
);

-- Institutions manage their own charge book; platform admins see all.
ALTER TABLE public.service_tariffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_tariffs_admin_all" ON public.service_tariffs;
CREATE POLICY "service_tariffs_admin_all"
  ON public.service_tariffs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
