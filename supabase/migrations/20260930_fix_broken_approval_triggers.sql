-- ============================================================
-- Doc'O Clock — Fix broken institution_applications triggers (2026-09-30)
--
-- Three triggers on institution_applications reference dropped columns,
-- causing EVERY status update to fail with ERROR 42703:
--   1. prevent_applicant_review_field_updates() references NEW.reviewed_by
--      (column does not exist)
--   2. log_institution_approval() references NEW.updated_by
--      (column does not exist)
--
-- Note: prevent_applicant_self_approval() was investigated and is FINE —
-- its live definition does not reference reviewed_by.
--
-- Fixes:
--   1. Remove the reviewed_by check (column dropped; status and
--      verification flags are already covered by
--      prevent_applicant_self_approval).
--   2. Use auth.uid() instead of NEW.updated_by (the approver's identity).
--
-- Idempotent; safe to re-run.
-- ============================================================

-- Fix 1: remove the reviewed_by reference.
-- The remaining checks (reviewer_notes, reviewed_at) are the review
-- metadata not covered by prevent_applicant_self_approval.
CREATE OR REPLACE FUNCTION public.prevent_applicant_review_field_updates()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Allow admins/super_admins to change anything
  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admin applicants cannot change review metadata fields.
  -- (status and verification flags are guarded by
  -- prevent_applicant_self_approval.)
  IF NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'Only administrators can modify review fields';
  END IF;

  RETURN NEW;
END;
$$;

-- Fix 2: use auth.uid() for the approver instead of the dropped
-- updated_by column.
CREATE OR REPLACE FUNCTION public.log_institution_approval()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource, resource_id,
      details, category, severity, outcome
    ) VALUES (
      auth.uid(),
      CASE WHEN NEW.status = 'approved'
           THEN 'APPROVE_APPLICATION'
           ELSE 'REJECT_APPLICATION' END,
      'institution_applications',
      NEW.id,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'review_notes', NEW.reviewer_notes,
        'institution_name', NEW.institution_name,
        'applicant_id', NEW.applicant_id
      ),
      'data_modification',
      'info',
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$;
