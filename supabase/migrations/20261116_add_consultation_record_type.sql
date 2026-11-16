-- Doc swarm group 2 (provider flows), 2026-11-16.
-- F1: EMR case sheets write record_type = 'consultation'
-- (src/components/hospital/EMRCaseSheets.tsx createCaseSheet), but the live
-- comprehensive_medical_records_record_type_check allowed only 18 values
-- and 'consultation' was not one of them, so every case-sheet creation
-- failed live with 23514 (check_violation). The base migration
-- (20250805115029) defined 9 values; the live list has since grown to 18.
-- This migration re-issues the CHECK with the live 18 values plus
-- 'consultation'. Idempotent: DROP IF EXISTS + ADD.
-- Verified live: inserts with record_type='consultation' 23514'd before
-- this change (all 27 provider professions, JWT replays) and succeed after.
ALTER TABLE public.comprehensive_medical_records
  DROP CONSTRAINT IF EXISTS comprehensive_medical_records_record_type_check;
ALTER TABLE public.comprehensive_medical_records
  ADD CONSTRAINT comprehensive_medical_records_record_type_check
  CHECK (record_type IN (
    'diagnosis', 'treatment', 'lab_result', 'imaging', 'procedure',
    'medication', 'allergy', 'vital_signs', 'vaccination', 'dental_record',
    'treatment_plan', 'imaging_request', 'radiology_report', 'equipment',
    'care_plan', 'activity', 'nursing_admission', 'emergency_case',
    'consultation'
  ));
