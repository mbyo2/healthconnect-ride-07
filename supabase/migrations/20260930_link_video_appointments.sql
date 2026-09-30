-- Link video appointments to the Telehealth Suite.
--
-- Problem: Booking a video consultation via the standard appointment booking
-- modal creates a row in `appointments` (type='video_consultation') but NOT
-- in `video_consultations`. The Telehealth Suite (/video-consultations) reads
-- only from `video_consultations`, so video appointments never appear there
-- and there's no "Join Meeting" button.
--
-- Fix: A trigger that auto-creates a `video_consultations` row whenever a
-- video-type appointment is inserted. Idempotent via appointment_id.

-- 1. Add appointment_id to video_consultations (nullable for back-compat).
ALTER TABLE public.video_consultations
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE;

-- 2. Trigger function: create video_consultations row for video appointments.
CREATE OR REPLACE FUNCTION public.trg_create_video_consultation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
BEGIN
  -- Only for video consultation appointments.
  IF NEW.type IS DISTINCT FROM 'video_consultation' THEN
    RETURN NEW;
  END IF;

  -- Idempotency: skip if a video consultation already exists for this appointment.
  IF EXISTS (SELECT 1 FROM public.video_consultations WHERE appointment_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Combine date + time into a timestamptz. Live schema uses `date` (date)
  -- and `time` (time) columns; fall back gracefully if null.
  BEGIN
    v_start := (NEW.date + NEW.time)::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    v_start := now();
  END;

  INSERT INTO public.video_consultations (
    patient_id, provider_id, appointment_id,
    scheduled_start, scheduled_end, status
  ) VALUES (
    NEW.patient_id, NEW.provider_id, NEW.id,
    v_start, v_start + interval '30 minutes',
    CASE WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'scheduled' END
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block appointment creation if video room setup fails.
  RAISE WARNING 'trg_create_video_consultation failed for appointment %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Attach the trigger.
DROP TRIGGER IF EXISTS trg_appointment_create_video_consultation ON public.appointments;
CREATE TRIGGER trg_appointment_create_video_consultation
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_create_video_consultation();

-- 4. Backfill: create video_consultations rows for existing video appointments
--    that don't have one yet.
INSERT INTO public.video_consultations (
  patient_id, provider_id, appointment_id,
  scheduled_start, scheduled_end, status
)
SELECT
  a.patient_id, a.provider_id, a.id,
  COALESCE((a.date + a.time)::timestamptz, now()),
  COALESCE((a.date + a.time)::timestamptz, now()) + interval '30 minutes',
  CASE WHEN a.status = 'cancelled' THEN 'cancelled'
       WHEN a.status = 'completed' THEN 'completed'
       ELSE 'scheduled' END
FROM public.appointments a
WHERE a.type = 'video_consultation'
  AND NOT EXISTS (
    SELECT 1 FROM public.video_consultations vc WHERE vc.appointment_id = a.id
  );
