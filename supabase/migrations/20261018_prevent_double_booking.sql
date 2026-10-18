-- Prevent double-booking: same provider, same date, same time
-- Only applies to active appointments (not cancelled)

-- Drop if exists (idempotent)
DROP INDEX IF EXISTS idx_appointments_no_double_book;

-- Create unique partial index
-- This prevents two active appointments for the same provider at the same date/time
CREATE UNIQUE INDEX idx_appointments_no_double_book
ON public.appointments (provider_id, date, time)
WHERE status NOT IN ('cancelled', 'no_show');
