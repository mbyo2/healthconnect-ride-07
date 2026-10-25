-- 2026-10-25 · Provider-types fix round (rendered sampling follow-up):
-- stale "COMING SOON" labels in the provider dashboard's My Practice
-- Modules list. The label is data-driven (provider_module_charter.status);
-- the specialty workflows below are built, live and proven end-to-end in
-- the 2026-10-25 provider-types sweep, so their charter rows must say
-- 'live'. Mirrors the 2026-10-07 facility-charter precedent
-- (20261007_charter_built_modules_live.sql).
--
-- Flipped (workflow -> where it works):
--   dental_chart      dentist, dental_therapist  -> DentistWorkflow FDI chart (dental_charts, sweep bug 5)
--   nutrition_plans   nutritionist               -> NutritionistWorkflow Diet Plan Builder (sweep bug 6)
--   vision_tests      optometrist                -> OptometristWorkflow Eye Examination Record (eye_examinations)
--   optical_dispensing optician                  -> OpticianWorkflow lens orders (lens_orders create/dispense)
--   anc_register      midwife                    -> MidwifeWorkflow ANC visit record (anc_visits)
--   vitals            nurse, registered_nurse,
--                     enrolled_nurse             -> NurseWorkflow structured vitals entry (vital_signs)
--   imaging_queue     radiographer, radiologist  -> RadiologyImaging worklist (modality queue + report
--                                                    dispatch) / Imaging page worklist (imaging_orders)
--   rehab_plans       physiotherapist            -> PhysiotherapyCenter session filing (specialist_sessions)
--
-- Deliberately LEFT 'planned' (no working provider-facing workflow in the
-- product today — flipping them would be a new false label):
--   referrals (all types): institution-mediated only (ReferralManagement
--     inside the facility HMS; the standalone route is role-restricted and
--     institution-bound — no provider module exists).
--   reports (all types): no dedicated provider practice-reports module;
--     the dashboard Analytics tab is a separate surface, not this module.
--   ward_rounds (nursing cadres, midwife): no ward-rounds writer; rounds
--     live in the institution IPD module, not the provider console.
--   field_visits (community_health_worker, environmental_health_officer):
--     consoles are presentational shells; activity records are API-level.
--   therapy_notes (psychologist): the live specialty tool is PHQ-9
--     assessment; no therapy-notes writer exists in the UI.
--   rehab_plans (occupational_therapist): no dedicated UI writer (the
--     sweep's OT artefact was API-level under the shared session store).
--   vitals (doctor, specialist, medical_licentiate, clinical_officer,
--     midwife): no standalone vitals-capture writer in their workflows
--     (midwife BP rides inside the ANC record; capture is a nursing-tool
--     function in this product).

UPDATE public.provider_module_charter
SET status = 'live'
WHERE status = 'planned'
  AND (provider_type, module_key) IN (
    ('dentist', 'dental_chart'),
    ('dental_therapist', 'dental_chart'),
    ('nutritionist', 'nutrition_plans'),
    ('optometrist', 'vision_tests'),
    ('optician', 'optical_dispensing'),
    ('midwife', 'anc_register'),
    ('nurse', 'vitals'),
    ('registered_nurse', 'vitals'),
    ('enrolled_nurse', 'vitals'),
    ('radiographer', 'imaging_queue'),
    ('radiologist', 'imaging_queue'),
    ('physiotherapist', 'rehab_plans')
  );
