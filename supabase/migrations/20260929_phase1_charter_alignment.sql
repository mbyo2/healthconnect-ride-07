-- Phase 1 (2026-09-29): charter + provider_types alignment.
--
-- 1. Promote phlebotomist to a full provider type. The codebase already treats
--    it as a provider profession (USER_ROLES, role metadata, lab role groups,
--    permissions, document requirements, app_role/user_role enums) but it was
--    missing from provider_types, so it could never self-register and the
--    approval trigger's provider_types allowlist could never grant it.
-- 2. Seed phlebotomist charter rows (mirrors lab_technician's lab console).
-- 3. Add live telehealth charter rows for consultable professions that already
--    hold the video routes in permissions but had no tile: dentist,
--    dental_therapist, traditional_practitioner, optometrist.
-- 4. Correct two charter rows that advertised prescribing to non-prescribers:
--    optometrist + health_personnel 'prescriptions' -> 'planned'. Only the five
--    legal prescribing professions keep a live prescriptions module.
--
-- Idempotent: safe to re-run.

-- ── 1. phlebotomist provider type ──────────────────────────────────────────
INSERT INTO public.provider_types (code, name, description, requires_license, requires_verification, display_order)
VALUES ('phlebotomist', 'Phlebotomist', 'HPCZ phlebotomy cadre — blood sample collection', true, true, 26)
ON CONFLICT (code) DO NOTHING;

-- ── 2. phlebotomist charter (lab console, mirrors lab_technician) ───────────
INSERT INTO public.provider_module_charter (provider_type, module_key, module_label, module_description, status, display_order)
VALUES
  ('phlebotomist', 'test_queue', 'Test queue & verification', 'Process and verify lab tests', 'live', 1),
  ('phlebotomist', 'appointments', 'Appointments & day list', 'Manage bookings and the daily queue', 'live', 2),
  ('phlebotomist', 'patients', 'My patients', 'Patient list and histories', 'live', 3),
  ('phlebotomist', 'billing', 'Billing & payments', 'Invoices, receipts and mobile-money', 'live', 4),
  ('phlebotomist', 'schedule', 'Working hours & availability', 'Set availability for bookings', 'live', 5)
ON CONFLICT (provider_type, module_key) DO NOTHING;

-- ── 3. telehealth tiles for consultable professions that already hold ──────
-- ──    the video routes in their permission sets ───────────────────────────
INSERT INTO public.provider_module_charter (provider_type, module_key, module_label, module_description, status, display_order)
VALUES
  ('dentist', 'telehealth', 'Telehealth video consults', 'Video consultations with patients', 'live', 11),
  ('dental_therapist', 'telehealth', 'Telehealth video consults', 'Video consultations with patients', 'live', 8),
  ('traditional_practitioner', 'telehealth', 'Telehealth video consults', 'Video consultations with patients', 'live', 6),
  ('optometrist', 'telehealth', 'Telehealth video consults', 'Video consultations with patients', 'live', 9)
ON CONFLICT (provider_type, module_key) DO NOTHING;

-- ── 4. prescriptions is live only for the five legal prescribers ───────────
UPDATE public.provider_module_charter
SET status = 'planned',
    module_description = 'E-prescriptions (planned — requires a licensed prescribing profession)'
WHERE module_key = 'prescriptions'
  AND provider_type IN ('optometrist', 'health_personnel')
  AND status = 'live';
