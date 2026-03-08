
-- Fix: Waitlist notification trigger (no ORDER BY in UPDATE)
CREATE OR REPLACE FUNCTION public.notify_waitlist_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at := now();
    
    -- Mark top 3 waitlist entries as notified using subquery
    UPDATE appointment_waitlist
    SET status = 'notified', notified_at = now(), updated_at = now()
    WHERE id IN (
      SELECT id FROM appointment_waitlist
      WHERE provider_id = NEW.provider_id
        AND status = 'waiting'
        AND expires_at > now()
      ORDER BY 
        CASE urgency WHEN 'urgent' THEN 1 WHEN 'soon' THEN 2 ELSE 3 END,
        created_at
      LIMIT 3
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_waitlist_on_cancel
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waitlist_on_cancellation();
