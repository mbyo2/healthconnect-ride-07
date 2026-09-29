-- ============================================================
-- Doc'O Clock — document the live institution_personnel role check
--
-- Drift: on 2026-09-29 the live institution_personnel_role_check
-- constraint was expanded ad-hoc to allow 'pharmacist' (needed for
-- the pharmacy QA staff linkage). The repo migration
-- (20251214_create_institution_personnel.sql) still only allowed
-- ('doctor', 'nurse', 'admin', 'staff', 'technician').
--
-- This migration brings the repo in line with production.
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TABLE public.institution_personnel
  DROP CONSTRAINT IF EXISTS institution_personnel_role_check;

ALTER TABLE public.institution_personnel
  ADD CONSTRAINT institution_personnel_role_check
  CHECK (role IN ('doctor', 'nurse', 'admin', 'staff', 'technician', 'pharmacist'));
