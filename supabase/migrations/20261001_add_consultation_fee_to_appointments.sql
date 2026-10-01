-- Add consultation_fee to appointments to persist the provider's configured
-- price at booking time. The provider sets consultation_fee_min/max on their
-- profile; the booking records the agreed fee so payments and earnings can
-- be validated against it.
--
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'consultation_fee'
  ) THEN
    ALTER TABLE public.appointments
      ADD COLUMN consultation_fee NUMERIC(10,2);
  END IF;
END
$$;

COMMENT ON COLUMN public.appointments.consultation_fee IS
  'Provider-configured consultation fee (ZMW) captured at booking time from the provider profile consultation_fee_min/max.';
