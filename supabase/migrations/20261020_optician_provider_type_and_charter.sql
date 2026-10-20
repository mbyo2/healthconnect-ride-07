-- ============================================================================
-- Optician — register the 27th provider profession in the DB taxonomies.
--
-- The optician ROLE already exists in the live app_role enum (added by
-- 20261017_optical_prescriptions.sql; verified live 2026-10-20 via REST:
-- user_roles?role=eq.optician returns 200 while a bogus value returns
-- 400/22P02). What was missing — and why OpticianWorkflow was unreachable:
--
--   1. No 'optician' row in public.provider_types. The signup triggers
--      (assign_default_role / auto_create_provider_application /
--      grant_provider_role_on_approval) allowlist professions against
--      ACTIVE provider_types rows (20260929_phase1_provider_signup_allowlist),
--      so an optician signup fell through to 'patient' and could never be
--      granted the exact role on approval — the same trap phlebotomist
--      was in before 20260929_phase1_charter_alignment.
--   2. No provider_module_charter rows, so the ProviderDashboard showed
--      no chartered modules for the profession.
--
-- Charter mirrors the optometrist's (eye-care allied cadre) minus the
-- prescriptions module: opticians DISPENSE optical prescriptions, they
-- do not issue orthodox prescriptions. The profession-specific module
-- (optical dispensing) is 'planned' in the charter following the
-- dentist dental_chart / optometrist vision_tests precedent — the
-- dispensing workspace itself ships as the dashboard Specialty Tools
-- tab (OpticianWorkflow).
--
-- Column names verified against the LIVE table 2026-10-20
-- (module_name / description — NOT module_label / module_description).
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ── 1. provider_types — optician as a distinct profession ──────────────────
INSERT INTO public.provider_types (code, name, description, requires_license, requires_verification, display_order)
VALUES ('optician', 'Optician (Dispensing)', 'HPCZ optical dispensing cadre — fits and dispenses corrective lenses', true, true, 28)
ON CONFLICT (code) DO NOTHING;

-- ── 2. provider_module_charter — optician workspace modules ────────────────
INSERT INTO public.provider_module_charter
  (provider_type, module_key, module_name, description, status, display_order)
VALUES
  ('optician', 'appointments', 'Appointments & day list', 'Manage bookings and the daily queue', 'live', 1),
  ('optician', 'telehealth', 'Telehealth video consults', 'Video consultations with patients', 'live', 2),
  ('optician', 'consultations', 'Consultation notes', 'Record consultations in the patient EMR', 'live', 3),
  ('optician', 'optical_dispensing', 'Optical prescriptions & lens orders', 'Dispense glasses and contact lenses from optical prescriptions', 'planned', 4),
  ('optician', 'patients', 'My patients', 'Patient list and histories', 'live', 5),
  ('optician', 'billing', 'Billing & payments', 'Invoices, receipts and mobile-money', 'live', 6),
  ('optician', 'schedule', 'Working hours & availability', 'Set availability for bookings', 'live', 7),
  ('optician', 'referrals', 'Referrals', 'Refer patients to facilities and specialists', 'planned', 8)
ON CONFLICT (provider_type, module_key) DO NOTHING;
