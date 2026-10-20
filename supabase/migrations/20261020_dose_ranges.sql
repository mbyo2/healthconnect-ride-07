-- Dose-Range Checking (Patient Safety)
-- Reference dose ranges for common formulary medications.
-- The prescription writer validates entered doses against these ranges
-- and warns (never hard-blocks) on out-of-range doses — the prescriber
-- acknowledges and proceeds if clinically justified.
-- Date: 2026-10-20

CREATE TABLE IF NOT EXISTS public.medication_dose_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name TEXT NOT NULL, -- generic name, lowercase match
  aliases TEXT[] DEFAULT '{}', -- brand names / alternate spellings
  -- Adult single-dose range
  min_single_dose DECIMAL(10,2),
  max_single_dose DECIMAL(10,2),
  dose_unit TEXT NOT NULL DEFAULT 'mg', -- mg, g, ml, units, mcg
  -- Daily limits
  max_daily_dose DECIMAL(10,2),
  -- Pediatric (per kg)
  pediatric_mg_per_kg_min DECIMAL(10,2),
  pediatric_mg_per_kg_max DECIMAL(10,2),
  pediatric_max_single_dose DECIMAL(10,2),
  -- Frequency
  max_frequency_per_day INTEGER,
  -- Special populations
  renal_warning TEXT,
  hepatic_warning TEXT,
  pregnancy_category TEXT, -- A, B, C, D, X
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.medication_dose_ranges ENABLE ROW LEVEL SECURITY;

-- Reference data: readable by all authenticated users
CREATE POLICY "Authenticated users read dose ranges"
  ON public.medication_dose_ranges FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_dose_ranges_name ON public.medication_dose_ranges(medication_name);

-- Seed: common Zambia formulary medications (standard reference ranges)
INSERT INTO public.medication_dose_ranges
  (medication_name, aliases, min_single_dose, max_single_dose, dose_unit, max_daily_dose, pediatric_mg_per_kg_min, pediatric_mg_per_kg_max, pediatric_max_single_dose, max_frequency_per_day, pregnancy_category, notes)
VALUES
  ('paracetamol', ARRAY['acetaminophen','panadol','tylenol'], 500, 1000, 'mg', 4000, 10, 15, 1000, 4, 'B', 'Max 4g/day adults. Reduce in liver disease or low body weight.'),
  ('ibuprofen', ARRAY['brufen','advil'], 200, 400, 'mg', 1200, 5, 10, 400, 3, 'C', 'Avoid in renal impairment, peptic ulcer, third trimester.'),
  ('amoxicillin', ARRAY['amoxil'], 250, 1000, 'mg', 3000, 20, 40, 1000, 3, 'B', 'Dose divided 8-hourly. Adjust in renal impairment.'),
  ('metformin', ARRAY['glucophage'], 500, 1000, 'mg', 2550, NULL, NULL, NULL, 3, 'B', 'Start low, titrate. Hold in acute illness / before contrast. eGFR <30 contraindicated.'),
  ('amlodipine', ARRAY['norvasc'], 2.5, 10, 'mg', 10, NULL, NULL, NULL, 1, 'C', 'Once daily. Max 10mg/day.'),
  ('losartan', ARRAY['cozaar'], 25, 100, 'mg', 100, NULL, NULL, NULL, 1, 'D', 'CONTRAINDICATED in pregnancy. Monitor K+ and renal function.'),
  ('hydrochlorothiazide', ARRAY['hctz'], 12.5, 50, 'mg', 50, NULL, NULL, NULL, 1, 'C', 'Monitor electrolytes.'),
  ('omeprazole', ARRAY['losec','prilosec'], 10, 40, 'mg', 40, NULL, NULL, NULL, 1, 'C', 'Usually 20mg once daily.'),
  ('cetirizine', ARRAY['zyrtec'], 5, 10, 'mg', 10, 0.25, 0.25, 5, 1, 'B', 'Once daily. Halve dose in renal impairment.'),
  ('azithromycin', ARRAY['zithromax'], 250, 500, 'mg', 500, 10, 10, 500, 1, 'B', 'Typically 500mg day 1, then 250mg days 2-5, or 500mg daily x3.'),
  ('ciprofloxacin', ARRAY['cipro'], 250, 750, 'mg', 1500, NULL, NULL, NULL, 2, 'C', 'Avoid in children/pregnancy where alternatives exist. QT prolongation risk.'),
  ('doxycycline', ARRAY['vibramycin'], 100, 200, 'mg', 200, NULL, NULL, NULL, 2, 'D', 'CONTRAINDICATED in pregnancy and children <8 years.'),
  ('metronidazole', ARRAY['flagyl'], 200, 500, 'mg', 2000, 7.5, 7.5, 500, 3, 'B', 'Avoid alcohol during and 48h after (disulfiram-like reaction).'),
  ('artemether-lumefantrine', ARRAY['coartem','alu'], 80, 80, 'mg', 480, NULL, NULL, NULL, 2, 'C', 'Adult: 4 tabs (80/480) per dose, 6 doses over 3 days. Dose by weight in children.'),
  ('insulin glargine', ARRAY['lantus'], 10, 100, 'units', NULL, NULL, NULL, NULL, 1, 'C', 'Dose highly individualised. Units, not mg.'),
  ('salbutamol', ARRAY['ventolin','albuterol'], 2, 4, 'mg', 16, 0.1, 0.15, 4, 4, 'C', 'Oral dose shown; inhaler 100-200mcg per dose more common.'),
  ('prednisolone', ARRAY['prednisone'], 5, 60, 'mg', 80, 0.5, 2, 60, 1, 'C', 'Dose varies widely by indication. Taper after prolonged use.'),
  ('tramadol', ARRAY['ultram'], 50, 100, 'mg', 400, NULL, NULL, NULL, 4, 'C', 'Max 400mg/day. Seizure and serotonin-syndrome risk.'),
  ('diclofenac', ARRAY['voltaren'], 25, 75, 'mg', 150, 1, 3, 50, 3, 'C', 'CV and GI risk. Lowest effective dose, shortest duration.'),
  ('ferrous sulfate', ARRAY['iron'], 60, 200, 'mg', 600, 3, 6, 200, 3, 'A', 'Elemental iron content varies by salt. Take with vitamin C, away from tea.'),
  ('folic acid', ARRAY['folate'], 0.4, 5, 'mg', 5, NULL, NULL, NULL, 1, 'A', '0.4mg daily prevention; 5mg for treatment / high-risk pregnancy.'),
  ('zinc sulfate', ARRAY['zinc'], 10, 20, 'mg', 40, 10, 20, 20, 1, 'A', 'WHO: 20mg daily x10-14 days for childhood diarrhoea (10mg if <6 months).'),
  ('ors', ARRAY['oral rehydration salts'], 200, 300, 'ml', NULL, 50, 100, NULL, NULL, 'A', 'Volume-based, after each loose stool. Not a mg dose.'),
  ('ceftriaxone', ARRAY['rocephin'], 250, 2000, 'mg', 4000, 50, 100, 2000, 2, 'B', 'IM/IV. Avoid in neonates with hyperbilirubinaemia.'),
  ('gentamicin', ARRAY['garamycin'], 80, 240, 'mg', 5, 5, 7.5, NULL, 1, 'D', 'Dose in mg/kg/day (5-7.5). Monitor renal function and levels. Nephro/ototoxic.')
ON CONFLICT DO NOTHING;
