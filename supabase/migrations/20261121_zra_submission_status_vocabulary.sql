-- ZRA Smart Invoice — the fiscal_submissions status CHECK dates from
-- the Oct-2025 manual schema (zra-vsdc-fiscal-schema.sql) and only
-- allows the old page's vocabulary ('submitted', 'accepted',
-- 'rejected', 'retrying', ...). The declaration worker's lifecycle
-- (queued -> sending -> sent / failed, per the mission spec) was
-- silently refused by it: the worker's claim update violated the
-- CHECK and the queue never moved (found in the 2026-11-21 live
-- proof). Widen the CHECK to the union of both vocabularies — the
-- legacy values stay valid for any historical row, the worker's
-- states become legal.

ALTER TABLE public.fiscal_submissions
  DROP CONSTRAINT fiscal_submissions_status_check;

ALTER TABLE public.fiscal_submissions
  ADD CONSTRAINT fiscal_submissions_status_check
  CHECK (status IN (
    'not_required', 'queued', 'submitted', 'accepted', 'rejected',
    'retrying', 'error',
    'sending', 'sent', 'failed'
  ));
