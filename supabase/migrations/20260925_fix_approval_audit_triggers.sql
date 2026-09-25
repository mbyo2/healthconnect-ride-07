-- Approval audit triggers must be SECURITY DEFINER.
--
-- Problem: log_application_approval() and log_institution_approval() are plain
-- plpgsql trigger functions, so their INSERT INTO public.audit_logs runs under
-- the approving user's RLS. Production's audit_logs INSERT policies do not
-- cover this path, so every provider/institution approval failed with
-- "new row violates row-level security policy for table audit_logs".
--
-- Fix: run the audit write as the function owner (definer), which is the
-- standard pattern for system audit triggers. The audit insert is a system
-- action, not a user data write.

CREATE OR REPLACE FUNCTION public.log_application_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log approval/rejection to audit_logs table
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource,
      resource_id,
      details,
      category,
      severity,
      outcome
    ) VALUES (
      NEW.reviewed_by,
      CASE WHEN NEW.status = 'approved' THEN 'APPROVE_APPLICATION' ELSE 'REJECT_APPLICATION' END,
      'health_personnel_applications',
      NEW.id,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'review_notes', NEW.review_notes,
        'user_id', NEW.user_id
      ),
      'data_modification',
      'info',
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_institution_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log approval/rejection to audit_logs table
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource,
      resource_id,
      details,
      category,
      severity,
      outcome
    ) VALUES (
      COALESCE(NEW.updated_by, (SELECT admin_id FROM public.healthcare_institutions WHERE id = (
        SELECT institution_id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
      ) LIMIT 1)),
      CASE WHEN NEW.status = 'approved' THEN 'APPROVE_APPLICATION' ELSE 'REJECT_APPLICATION' END,
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
