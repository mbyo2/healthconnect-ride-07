-- ============================================================================
-- Optician — parity value in the public.user_role enum (profiles.role type).
--
-- STANDALONE on purpose: enum additions must not share a transaction block
-- with dependent changes, so this file contains ONLY the ALTER TYPE.
--
-- Evidence (live probe, 2026-10-20, anon REST):
--   profiles?role=eq.optician  -> 400 / 22P02
--     "invalid input value for enum user_role: \"optician\""
--   profiles?role=eq.dentist  -> 200 (dentist/optometrist are in BOTH enums)
-- The live app_role enum already contains 'optician'
-- (20261017_optical_prescriptions.sql), so user_roles works today and
-- profiles.role is never set to the exact profession by design (provider
-- holding role is 'health_personnel'). This addition is parity with
-- dentist/optometrist and removes a landmine for any future write of
-- 'optician' into a user_role column.
-- ============================================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'optician';
