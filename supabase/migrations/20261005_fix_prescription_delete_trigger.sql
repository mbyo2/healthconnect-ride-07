-- Fix prescription DELETE trigger FK violation
-- The trigger_log_prescription_changes is AFTER DELETE, but its DELETE branch
-- tries to INSERT into prescription_history referencing OLD.id AFTER the
-- prescription row is already gone. This violates the FK constraint.
-- The FK is ON DELETE CASCADE, so history rows are already cleaned up.
-- The DELETE branch is fundamentally broken and must be removed.

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
    -- Do NOT insert history on delete: the prescription row is already gone
    -- (AFTER trigger) so the FK would fail. ON DELETE CASCADE cleans up
    -- existing history rows automatically.
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.log_prescription_changes() IS
  'Audit trigger for prescriptions. DELETE branch intentionally does not log: FK would fail on AFTER trigger.';
