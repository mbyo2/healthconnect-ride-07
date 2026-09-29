-- ============================================================
-- Doc'O Clock — seed the phlebotomist provider type
--
-- Drift: on 2026-09-29 the live public.provider_types table was
-- seeded ad-hoc with the 'phlebotomist' row (it exists in the
-- user_role/app_role enums and the taxonomy counts 26 professions,
-- but the repo seed in 20260918_health_workforce_roles.sql only
-- inserted 25 rows, ending at 'health_personnel').
--
-- This migration captures the live row idempotently.
-- Safe to re-run (no-op where already present).
-- ============================================================

INSERT INTO public.provider_types
  (code, name, description, requires_license, requires_verification, display_order)
VALUES
  ('phlebotomist', 'Phlebotomist', 'HPCZ phlebotomy / sample-collection cadre', true, true, 26)
ON CONFLICT (code) DO NOTHING;
