-- Fix lab notification trigger: remove non-existent related_id column from INSERT
-- The notifications table has 8 columns (id, user_id, title, message, type, read, created_at, updated_at)
-- but the trigger was trying to insert into related_id which doesn't exist, causing silent failures.
-- Date: 2026-10-19

CREATE OR REPLACE FUNCTION public.notify_doctor_on_lab_result()
RETURNS TRIGGER AS $$
DECLARE 
  v_ordering_doctor_id UUID; 
  v_patient_name TEXT; 
  v_test_name TEXT; 
BEGIN 
  IF NEW.verified_at IS NULL OR (OLD.verified_at IS NOT NULL) THEN 
    RETURN NEW; 
  END IF; 
  SELECT ordered_by, test_type INTO v_ordering_doctor_id, v_test_name 
  FROM public.lab_tests WHERE id = NEW.request_id LIMIT 1; 
  IF v_ordering_doctor_id IS NULL THEN 
    RETURN NEW; 
  END IF; 
  SELECT COALESCE(first_name || ' ' || last_name, 'Patient') INTO v_patient_name 
  FROM public.profiles WHERE id = NEW.patient_id; 
  INSERT INTO public.notifications (user_id, title, message, type) 
  VALUES (v_ordering_doctor_id, 'Lab Result Ready', v_test_name || ' results for ' || v_patient_name || ' are now available.', 'lab_result'); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
