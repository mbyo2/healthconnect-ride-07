-- W3 QA sweep 2026-10-28 — P1: lab result verification was impossible.
--
-- BUG (proven live 2026-10-28, Doc'O Clock QA sweep W3): verifying a lab
-- result always failed and rolled back. Chain:
--   1. Pathologist sets lab_tests.verified_at (LabManagement.verifyResult).
--   2. trg_mirror_lab_test_verification mirrors verified_at onto
--      lab_results (request_id = lab_tests.id).
--   3. trg_lab_result_notify_doctor (AFTER UPDATE OF verified_at ON
--      lab_results) runs notify_doctor_on_lab_result(), which inserts a
--      notifications row with type = 'lab_result'.
--   4. notifications_type_check only allows ('appointment','message',
--      'system') — the canonical vocabulary used by
--      src/services/notifications.ts — so the insert raises 23514 and the
--      ENTIRE verification transaction rolls back. verified_by/verified_at
--      never persist; patients never see verified results; the UI shows
--      "Failed to verify result". Directly setting lab_results.verified_at
--      fails the same way. The live notifications table is empty partly
--      because every non-canonical insert dies on this check.
--
-- FIX: the trigger now writes the canonical type 'system' (the
-- Notifications UI renders unknown/system types with its default icon and
-- the title/message carry the meaning), and the notification insert is
-- wrapped in an exception handler: a notification failure must NEVER roll
-- back a clinical sign-off again.
--
-- CREATE OR REPLACE preserves the function's existing ACL (execute was
-- revoked from public/anon/authenticated in
-- 20261025_stagec16_function_acl_sweep.sql). No GRANT changes, no new
-- tables, no policy changes.

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
  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_ordering_doctor_id, 'Lab Result Ready',
            v_test_name || ' results for ' || v_patient_name || ' are now available.',
            'system');
  EXCEPTION WHEN OTHERS THEN
    -- Notification delivery is best-effort; it must never block or roll
    -- back the clinical verification that fired this trigger.
    RAISE WARNING 'notify_doctor_on_lab_result: notification insert failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.notify_doctor_on_lab_result() IS
  'Notifies the ordering doctor when a lab result is verified. Uses the canonical notifications type ''system'' (2026-10-28 W3 fix: ''lab_result'' violated notifications_type_check and rolled back every verification). Notification failure is swallowed with a WARNING so it can never block sign-off.';
