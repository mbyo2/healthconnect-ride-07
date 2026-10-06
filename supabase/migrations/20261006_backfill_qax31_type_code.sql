-- Backfill type_code for QAX31 institutions based on name
UPDATE public.healthcare_institutions
SET type_code = CASE
  WHEN name ILIKE '%day surgery%' THEN 'day_surgery_centre'
  WHEN name ILIKE '%district hospital%' THEN 'district_hospital'
  WHEN name ILIKE '%provincial hospital%' THEN 'provincial_hospital'
  WHEN name ILIKE '%nursing home%' OR name ILIKE '%care home%' THEN 'nursing_home'
  WHEN name ILIKE '%surgical centre%' THEN 'surgical_centre'
  WHEN name = 'QAX31 Test Hospital' THEN 'hospital'
  ELSE type_code
END
WHERE name LIKE 'QAX31%' AND type_code IS NULL;
