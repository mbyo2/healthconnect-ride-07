-- No-show workflow columns (audit 2026-10-20)
-- The NoShowWorkflow UI referenced no_show_at / no_show_reason /
-- follow_up_status, but the columns never existed on appointments, so a
-- no-show could be neither reasoned nor followed up. Add them for real.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_reason text,
  ADD COLUMN IF NOT EXISTS follow_up_status text;

COMMENT ON COLUMN public.appointments.no_show_at IS 'When the appointment was marked as a no-show';
COMMENT ON COLUMN public.appointments.no_show_reason IS 'Reason recorded when marking the no-show (staff-entered)';
COMMENT ON COLUMN public.appointments.follow_up_status IS 'No-show follow-up state: pending | contacted | reschedule_requested';
