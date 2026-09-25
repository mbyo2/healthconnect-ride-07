-- ============================================================
-- Doc'O Clock — one booking fee per appointment, enforced
--
-- Root cause: BOTH the trg_charge_booking_fee trigger (on appointments)
-- AND BookingModal's manual insert created a booking_fees row for a
-- new-patient booking, so providers were double-charged at the data
-- level (two 'pending' rows per appointment). The modal insert has been
-- removed from the codebase; the trigger is the single source of truth.
--
-- This migration repairs existing duplicates and makes the invariant
-- structural: exactly one fee row per appointment, from any write path.
-- Idempotent; safe to re-run.
-- ============================================================

-- 1. Repair: keep the earliest fee row per appointment, drop the rest.
--    (All pre-launch rows; the validator trigger had already normalized
--    duplicate amounts to the same authoritative value.)
DELETE FROM public.booking_fees bf
USING (
  SELECT appointment_id, MIN(created_at) AS first_created
  FROM public.booking_fees
  GROUP BY appointment_id
  HAVING COUNT(*) > 1
) dup
WHERE bf.appointment_id = dup.appointment_id
  AND bf.created_at > dup.first_created;

-- Edge: identical created_at timestamps — keep exactly one by id.
-- (id is UUID: cast to text so the aggregate is valid on every PG build;
--  this matches the expression applied to production via the dashboard.)
DELETE FROM public.booking_fees bf
USING (
  SELECT appointment_id, MIN(id::text) AS first_id
  FROM public.booking_fees
  GROUP BY appointment_id
  HAVING COUNT(*) > 1
) dup
WHERE bf.appointment_id = dup.appointment_id
  AND bf.id::text <> dup.first_id;

-- 2. Enforce: one fee per appointment, structurally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_fees_appointment_id_unique'
  ) THEN
    ALTER TABLE public.booking_fees
      ADD CONSTRAINT booking_fees_appointment_id_unique UNIQUE (appointment_id);
  END IF;
END $$;
