-- 2026-10-07: Mark actually-built modules as live in the charter.
-- blood_bank, ambulance, emergency, insurance, referrals, triage, reports
-- all have working UI but were still marked 'planned'.
-- Applied live 2026-10-07.

UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key IN ('blood_bank', 'ambulance', 'emergency', 'insurance', 'referrals', 'triage', 'reports')
  AND status = 'planned';
