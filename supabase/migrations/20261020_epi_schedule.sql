-- EPI Vaccination Schedule (Zambia Expanded Programme on Immunization)
-- Reference schedule: which vaccine-dose is due at which age.
-- The existing immunizations table records given/scheduled doses;
-- this table defines what SHOULD be given, so the tracker can compute
-- due / overdue / given status for a child from their date of birth.
-- Date: 2026-10-20

CREATE TABLE IF NOT EXISTS public.vaccination_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_name TEXT NOT NULL, -- display name, e.g. 'Pentavalent (DPT-HepB-Hib)'
  schedule_key TEXT NOT NULL, -- normalized key for matching, e.g. 'pentavalent'
  dose_number INTEGER NOT NULL,
  due_age_days INTEGER NOT NULL, -- age in days when the dose is due
  due_age_label TEXT NOT NULL, -- human label, e.g. '6 weeks'
  notes TEXT,
  country_code TEXT DEFAULT 'ZM',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, schedule_key, dose_number)
);

ALTER TABLE public.vaccination_schedule ENABLE ROW LEVEL SECURITY;

-- Reference data: readable by all authenticated users
CREATE POLICY "Authenticated users read vaccination schedule"
  ON public.vaccination_schedule FOR SELECT
  USING (auth.role() = 'authenticated');

-- Zambia EPI schedule (Ministry of Health Zambia)
INSERT INTO public.vaccination_schedule
  (vaccine_name, schedule_key, dose_number, due_age_days, due_age_label, notes)
VALUES
  ('BCG', 'bcg', 1, 0, 'Birth', 'Single dose, intradermal, at birth.'),
  ('OPV (Oral Polio Vaccine)', 'opv', 0, 0, 'Birth', 'OPV 0 at birth.'),
  ('Pentavalent (DPT-HepB-Hib)', 'pentavalent', 1, 42, '6 weeks', 'DPT-HepB-Hib dose 1.'),
  ('OPV (Oral Polio Vaccine)', 'opv', 1, 42, '6 weeks', 'OPV 1.'),
  ('PCV (Pneumococcal)', 'pcv', 1, 42, '6 weeks', 'PCV dose 1.'),
  ('Rotavirus', 'rotavirus', 1, 42, '6 weeks', 'Rotavirus dose 1.'),
  ('Pentavalent (DPT-HepB-Hib)', 'pentavalent', 2, 70, '10 weeks', 'DPT-HepB-Hib dose 2.'),
  ('OPV (Oral Polio Vaccine)', 'opv', 2, 70, '10 weeks', 'OPV 2.'),
  ('PCV (Pneumococcal)', 'pcv', 2, 70, '10 weeks', 'PCV dose 2.'),
  ('Rotavirus', 'rotavirus', 2, 70, '10 weeks', 'Rotavirus dose 2.'),
  ('Pentavalent (DPT-HepB-Hib)', 'pentavalent', 3, 98, '14 weeks', 'DPT-HepB-Hib dose 3.'),
  ('OPV (Oral Polio Vaccine)', 'opv', 3, 98, '14 weeks', 'OPV 3.'),
  ('PCV (Pneumococcal)', 'pcv', 3, 98, '14 weeks', 'PCV dose 3.'),
  ('IPV (Inactivated Polio Vaccine)', 'ipv', 1, 98, '14 weeks', 'IPV single dose with Penta 3.'),
  ('Measles-Rubella (MR)', 'measles', 1, 274, '9 months', 'MR dose 1. Give vitamin A capsule too.'),
  ('Yellow Fever', 'yellow-fever', 1, 274, '9 months', 'Given in designated districts at 9 months.'),
  ('Measles-Rubella (MR)', 'measles', 2, 548, '18 months', 'MR dose 2.')
ON CONFLICT DO NOTHING;
