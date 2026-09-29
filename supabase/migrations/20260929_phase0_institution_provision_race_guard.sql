-- Phase 0 hardening (2026-09-29): make institution auto-provisioning atomic.
--
-- The app auto-provisions one institution per user on first load. Two
-- concurrent hook executions could both pass the pre-insert re-check and
-- insert duplicate rows ~100ms apart (observed live: two identical
-- "QA's Healthcare Practice" pharmacies for one admin). The hook now treats
-- unique-violation (23505) on this index as "another execution won" and
-- adopts the existing row instead of falling back to a fake in-memory
-- institution (which breaks every downstream RLS check).
CREATE UNIQUE INDEX IF NOT EXISTS uq_healthcare_institutions_admin_name
  ON public.healthcare_institutions (admin_id, name);
