-- Notify ordering doctor when lab results are completed
-- This wires the lab module to the notification system

CREATE OR REPLACE FUNCTION public.notify_doctor_on_lab_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ordering_doctor_id UUID;
  v_patient_name TEXT;
  v_test_name TEXT;
BEGIN
  -- Only fire when result is newly verified (verified_at set)
  IF NEW.verified_at IS NULL OR (OLD.verified_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  -- Get the ordering doctor from the lab test
  SELECT ordered_by, test_type INTO v_ordering_doctor_id, v_test_name
  FROM public.lab_tests
  WHERE id = NEW.request_id
  LIMIT 1;

  IF v_ordering_doctor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get patient name
  SELECT COALESCE(first_name || ' ' || last_name, 'Patient') INTO v_patient_name
  FROM public.profiles
  WHERE id = NEW.patient_id;

  -- Create notification for the doctor
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    related_id
  ) VALUES (
    v_ordering_doctor_id,
    'Lab Result Ready',
    v_test_name || ' results for ' || v_patient_name || ' are now available.',
    'lab_result',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_result_notify_doctor ON public.lab_results;

CREATE TRIGGER trg_lab_result_notify_doctor
  AFTER UPDATE OF verified_at ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_doctor_on_lab_result();

GRANT EXECUTE ON FUNCTION public.notify_doctor_on_lab_result() TO authenticated;
