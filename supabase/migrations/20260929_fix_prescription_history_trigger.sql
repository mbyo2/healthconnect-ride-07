-- Fix log_prescription_changes trigger to match prescription_history schema
-- The trigger was writing to changed_by/change_type/old_values/new_values
-- but prescription_history has action/performed_by/action_details
-- This was blocking all e-prescription creation

CREATE OR REPLACE FUNCTION public.log_prescription_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.prescription_history (prescription_id, action, performed_by, action_details)
    VALUES (NEW.id, 'created', NEW.provider_id, jsonb_build_object('new_values', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.prescription_history (prescription_id, action, performed_by, action_details)
    VALUES (NEW.id, 'updated', NEW.provider_id, jsonb_build_object('old_values', to_jsonb(OLD), 'new_values', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.prescription_history (prescription_id, action, performed_by, action_details)
    VALUES (OLD.id, 'cancelled', OLD.provider_id, jsonb_build_object('old_values', to_jsonb(OLD)));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
