-- Auto-mirror lab test verification to lab_results
--
-- BUG (found 2026-10-07 via live lab workflow test): after a lab tech verifies
-- a result, lab_tests.verified_at is set but the lab_results mirror row keeps
-- verified_at NULL, so the patient's Lab Results still show "Pending
-- verification". Root cause: the frontend's best-effort mirror UPDATE is
-- RLS-blocked (only pathologist/admin can update lab_results).
--
-- FIX: AFTER UPDATE trigger on lab_tests that mirrors verified_at/verified_by
-- to the lab_results row automatically. Runs as SECURITY DEFINER so it is not
-- subject to the caller's RLS.

CREATE OR REPLACE FUNCTION public.mirror_lab_test_verification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
    UPDATE public.lab_results
    SET verified_at = NEW.verified_at,
        notes = CASE
          WHEN NEW.verified_at IS NOT NULL AND notes = 'Pending pathologist review'
          THEN NULL
          ELSE notes
        END
    WHERE request_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_lab_test_verification ON public.lab_tests;
CREATE TRIGGER trg_mirror_lab_test_verification
  AFTER UPDATE OF verified_at, verified_by ON public.lab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_lab_test_verification();

COMMENT ON FUNCTION public.mirror_lab_test_verification() IS
  'Mirrors lab_tests verification to lab_results so patient views update automatically.';
