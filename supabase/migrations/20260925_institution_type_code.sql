-- ============================================================
-- Doc'O Clock — preserve the precise facility type chosen at signup
--
-- healthcare_institutions.type is constrained to the coarse
-- healthcare_provider_type enum (hospital/clinic/pharmacy/...), so the
-- exact choice from institution_types (e.g. teaching_hospital vs
-- district_hospital) was flattened and lost. type_code keeps the exact
-- code so dashboards, module charters and staff-role suggestions can
-- actually respond to what the facility chose.
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TABLE public.healthcare_institutions
  ADD COLUMN IF NOT EXISTS type_code text;

COMMENT ON COLUMN public.healthcare_institutions.type_code IS
  'Exact institution_types code chosen at signup (e.g. teaching_hospital). type holds the coarse enum value.';
