-- Multi-tenancy: Add institution_id to core clinical tables
-- Enables strict institution data isolation for dashboards and queries
-- Date: 2026-10-19

-- 1. vital_signs
ALTER TABLE public.vital_signs 
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vital_signs_institution_id 
ON public.vital_signs(institution_id);

-- 2. lab_tests  
ALTER TABLE public.lab_tests
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_tests_institution_id
ON public.lab_tests(institution_id);

-- 3. hospital_billing
ALTER TABLE public.hospital_billing
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hospital_billing_institution_id
ON public.hospital_billing(institution_id);

-- Note: hospital_billing already has hospital_id, adding institution_id as alias for consistency
-- Backfill will copy from hospital_id where available

-- 4. prescriptions (pharmacy_prescriptions)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pharmacy_prescriptions') THEN
    ALTER TABLE public.pharmacy_prescriptions
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_pharmacy_prescriptions_institution_id
    ON public.pharmacy_prescriptions(institution_id);
  END IF;
END $$;
