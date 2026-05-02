
-- Add verification_notes to insurance_cards
ALTER TABLE public.insurance_cards
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Function: notify waitlist patients when an appointment is cancelled
CREATE OR REPLACE FUNCTION public.notify_waitlist_on_appointment_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waitlist_record RECORD;
  v_provider_name TEXT;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    SELECT COALESCE(first_name || ' ' || last_name, 'your provider')
      INTO v_provider_name
      FROM public.profiles WHERE id = NEW.provider_id;

    FOR v_waitlist_record IN
      SELECT id, patient_id
      FROM public.appointment_waitlist
      WHERE provider_id = NEW.provider_id
        AND status = 'waiting'
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY
        CASE urgency WHEN 'urgent' THEN 1 WHEN 'soon' THEN 2 ELSE 3 END,
        created_at
      LIMIT 3
    LOOP
      UPDATE public.appointment_waitlist
        SET status = 'notified', notified_at = now(), updated_at = now()
        WHERE id = v_waitlist_record.id;

      INSERT INTO public.notifications (user_id, title, message, type, read)
      VALUES (
        v_waitlist_record.patient_id,
        'Earlier slot available!',
        'A slot just opened with ' || v_provider_name || ' on ' || NEW.date || ' at ' || NEW.time || '. Tap to book before someone else does.',
        'appointment',
        false
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any then create
DROP TRIGGER IF EXISTS trg_notify_waitlist_on_cancellation ON public.appointments;
CREATE TRIGGER trg_notify_waitlist_on_cancellation
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waitlist_on_appointment_cancellation();
