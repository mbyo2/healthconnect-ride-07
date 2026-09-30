-- Immutable QA event log for pharmacy batches.
--
-- Problem: QA decisions (approve/quarantine/reject/release) were stored by
-- overwriting columns on medicine_batches (qa_status, qa_checked_by, ...).
-- Changing the status destroyed the previous decision — no audit trail.
--
-- Fix: Every QA decision now also inserts an immutable row here. RLS allows
-- INSERT and SELECT but never UPDATE or DELETE, so the history cannot be
-- altered or erased.

CREATE TABLE IF NOT EXISTS public.batch_qa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.medicine_batches(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  -- 'approved' | 'quarantined' | 'rejected' | 'released'
  action text NOT NULL CHECK (action IN ('approved', 'quarantined', 'rejected', 'released')),
  -- qa_status value before this event (null for the first decision)
  previous_status text,
  -- qa_status value after this event
  new_status text NOT NULL,
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_qa_events_batch
  ON public.batch_qa_events (batch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_qa_events_institution
  ON public.batch_qa_events (institution_id, created_at DESC);

ALTER TABLE public.batch_qa_events ENABLE ROW LEVEL SECURITY;

-- Staff of the institution can read the QA history.
DROP POLICY IF EXISTS "Institution staff read QA events" ON public.batch_qa_events;
CREATE POLICY "Institution staff read QA events"
  ON public.batch_qa_events FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff WHERE user_id = auth.uid()
    )
    OR institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );

-- Anyone who can update the batch can append a QA event (INSERT only).
DROP POLICY IF EXISTS "QA reviewers append QA events" ON public.batch_qa_events;
CREATE POLICY "QA reviewers append QA events"
  ON public.batch_qa_events FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff WHERE user_id = auth.uid()
    )
    OR institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies: the log is append-only and immutable.

-- Backfill: one event per batch that already has a QA decision.
INSERT INTO public.batch_qa_events
  (batch_id, institution_id, action, previous_status, new_status, decided_by, notes, created_at)
SELECT
  b.id,
  b.institution_id,
  CASE b.qa_status
    WHEN 'approved' THEN 'approved'
    WHEN 'quarantined' THEN 'quarantined'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'approved'
  END,
  NULL,
  b.qa_status,
  b.qa_checked_by,
  b.qa_notes,
  COALESCE(b.qa_checked_at, b.created_at, now())
FROM public.medicine_batches b
WHERE b.qa_status IS NOT NULL
  AND b.qa_status <> 'pending'
  AND b.qa_checked_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.batch_qa_events e WHERE e.batch_id = b.id
  );
