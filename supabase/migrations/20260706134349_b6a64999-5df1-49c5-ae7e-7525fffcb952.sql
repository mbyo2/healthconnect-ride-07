-- Prevent applicants from self-approving their institution application.
-- Drop overly permissive UPDATE policy and add a trigger that blocks non-admins
-- from modifying status/verification/documents/payment complete columns.

DROP POLICY IF EXISTS "Users can update their own applications" ON public.institution_applications;

CREATE OR REPLACE FUNCTION public.prevent_applicant_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role)
     OR public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.verification_complete IS DISTINCT FROM OLD.verification_complete
     OR NEW.documents_complete IS DISTINCT FROM OLD.documents_complete
     OR NEW.payment_complete IS DISTINCT FROM OLD.payment_complete THEN
    RAISE EXCEPTION 'Only administrators may modify approval fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_applicant_self_approval ON public.institution_applications;
CREATE TRIGGER trg_prevent_applicant_self_approval
BEFORE UPDATE ON public.institution_applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_applicant_self_approval();

-- Re-add a scoped UPDATE policy for applicants (their own row only)
CREATE POLICY "Users can update their own applications"
ON public.institution_applications
FOR UPDATE
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);