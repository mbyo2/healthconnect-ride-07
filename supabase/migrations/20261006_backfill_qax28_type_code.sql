-- ============================================================
-- Backfill type_code for QAX28 test institutions
-- These were created directly (not via signup) so type_code is NULL,
-- causing them to fall back to the generic clinic dashboard.
-- ============================================================

UPDATE public.healthcare_institutions
SET type_code = CASE
  WHEN name ILIKE '%diagnostic centre%' THEN 'diagnostic_centre'
  WHEN name ILIKE '%maternity hospital%' THEN 'maternity_hospital'
  WHEN name ILIKE '%psychiatric hospital%' THEN 'psychiatric_hospital'
  WHEN name ILIKE '%dialysis%' THEN 'dialysis_centre'
  WHEN name ILIKE '%community pharmacy%' THEN 'community_pharmacy'
  WHEN name ILIKE '%dental clinic%' THEN 'dental_clinic'
  WHEN name ILIKE '%trauma centre%' THEN 'trauma_centre'
  WHEN name ILIKE '%home-based care%' THEN 'home_based_care'
  ELSE type_code
END
WHERE name LIKE 'QAX28%' AND type_code IS NULL;
