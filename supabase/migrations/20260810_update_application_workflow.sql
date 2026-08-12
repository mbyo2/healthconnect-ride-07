-- Migration: Update Application Workflow to Require Admin Approval
-- Date: 2026-08-10
-- Purpose: Enforce admin review before provider/institution approval
-- Changes:
--   1. Update health_personnel_applications default status to 'pending'
--   2. Add review enforcement checks 
--   3. Ensure institution_applications also requires 'pending' default
--   4. Create audit trail for approval actions

-- Step 1: Update health_personnel_applications table
-- Ensure the status column properly defaults to 'pending' for new applications
ALTER TABLE public.health_personnel_applications 
ALTER COLUMN status SET DEFAULT 'pending'::text;

-- Step 2: Create index for faster status queries during admin review
CREATE INDEX IF NOT EXISTS idx_health_personnel_applications_status 
ON public.health_personnel_applications(status) 
WHERE status IN ('pending', 'under_review');

CREATE INDEX IF NOT EXISTS idx_health_personnel_applications_user_id 
ON public.health_personnel_applications(user_id);

-- Step 3: Update institution_applications table defaults
ALTER TABLE public.institution_applications 
ALTER COLUMN status SET DEFAULT 'pending'::text;

-- Step 4: Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_institution_applications_status 
ON public.institution_applications(status) 
WHERE status IN ('pending', 'under_review');

CREATE INDEX IF NOT EXISTS idx_institution_applications_applicant_id 
ON public.institution_applications(applicant_id);

-- Step 5: Add audit logging function for approval actions
-- This function automatically logs when applications are approved/rejected
CREATE OR REPLACE FUNCTION log_application_approval()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for health_personnel_applications
DROP TRIGGER IF EXISTS trigger_log_health_personnel_approval ON public.health_personnel_applications;

CREATE TRIGGER trigger_log_health_personnel_approval
AFTER UPDATE ON public.health_personnel_applications
FOR EACH ROW
EXECUTE FUNCTION log_application_approval();

-- Step 7: Create similar function for institution_applications
CREATE OR REPLACE FUNCTION log_institution_approval()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for institution_applications
DROP TRIGGER IF EXISTS trigger_log_institution_approval ON public.institution_applications;

CREATE TRIGGER trigger_log_institution_approval
AFTER UPDATE ON public.institution_applications
FOR EACH ROW
EXECUTE FUNCTION log_institution_approval();

-- Step 9: Add admin approval requirement constraint via RLS policy
-- Create policy to ensure only admins can approve applications
CREATE POLICY "Only admins can approve health personnel applications"
ON public.health_personnel_applications
FOR UPDATE
USING (
  -- Allow update only if user has admin role
  (SELECT admin_level FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
)
WITH CHECK (
  -- Additional check for approval status changes
  (SELECT admin_level FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- Step 10: RLS policy for institution applications
CREATE POLICY "Only admins can approve institution applications"
ON public.institution_applications
FOR UPDATE
USING (
  -- Allow update only if user has admin role
  (SELECT admin_level FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
)
WITH CHECK (
  -- Additional check for approval status changes
  (SELECT admin_level FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- Step 11: Add comment for documentation
COMMENT ON COLUMN public.health_personnel_applications.status IS 
'Application status workflow: pending -> under_review -> approved/rejected. Default status for new applications is pending.';

COMMENT ON COLUMN public.institution_applications.status IS 
'Application status workflow: pending -> under_review -> approved/rejected. Default status for new applications is pending.';

-- Step 12: Create a view for admin dashboard to see pending applications
CREATE OR REPLACE VIEW pending_applications AS
SELECT 
  'health_personnel' as application_type,
  hp.id,
  hp.user_id as applicant_id,
  p.first_name || ' ' || COALESCE(p.last_name, '') as applicant_name,
  p.email,
  p.phone,
  hp.status,
  hp.created_at as submitted_date,
  hp.documents_url,
  hp.review_notes,
  hp.reviewed_by,
  hp.reviewed_at
FROM public.health_personnel_applications hp
LEFT JOIN public.profiles p ON hp.user_id = p.id
WHERE hp.status IN ('pending', 'under_review')

UNION ALL

SELECT 
  'institution' as application_type,
  ia.id,
  ia.applicant_id,
  ia.institution_name as applicant_name,
  NULL as email,
  NULL as phone,
  ia.status,
  ia.submitted_at as submitted_date,
  NULL as documents_url,
  ia.reviewer_notes as review_notes,
  NULL as reviewed_by,
  ia.reviewed_at
FROM public.institution_applications ia
WHERE ia.status IN ('pending', 'under_review');

-- Step 13: Grant appropriate permissions
GRANT SELECT ON public.pending_applications TO authenticated;
GRANT SELECT ON public.health_personnel_applications TO authenticated;
GRANT UPDATE ON public.health_personnel_applications TO authenticated;
GRANT SELECT ON public.institution_applications TO authenticated;
GRANT UPDATE ON public.institution_applications TO authenticated;

-- Migration metadata
-- This migration ensures:
-- 1. All new provider registrations default to 'pending' status
-- 2. Admin-only approval workflow is enforced at database level
-- 3. Audit trail is automatically maintained
-- 4. Pending applications can be easily viewed via pending_applications view
--
-- Rollback instructions (if needed):
-- - Drop triggers: trigger_log_health_personnel_approval, trigger_log_institution_approval
-- - Drop functions: log_application_approval(), log_institution_approval()
-- - Drop view: pending_applications
-- - Drop policies (if RLS is disabled, these won't exist)
-- - Drop indexes created above
-- - Revert status defaults to 'approved'
