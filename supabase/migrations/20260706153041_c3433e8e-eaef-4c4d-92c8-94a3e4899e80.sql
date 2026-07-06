
-- 1. institution_applications: prevent self-approval
DROP POLICY IF EXISTS "Users can update their own applications" ON public.institution_applications;
CREATE POLICY "Users can update their own pending applications"
ON public.institution_applications
FOR UPDATE
USING (
  auth.uid() = applicant_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = applicant_id
  AND status = 'pending'
);

-- Trigger to prevent applicants from modifying reviewer/verification fields
CREATE OR REPLACE FUNCTION public.prevent_applicant_review_field_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins/super_admins to change anything
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admin applicants cannot change review/verification/status fields
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.verification_complete IS DISTINCT FROM OLD.verification_complete
     OR NEW.documents_complete IS DISTINCT FROM OLD.documents_complete
     OR NEW.payment_complete IS DISTINCT FROM OLD.payment_complete
  THEN
    RAISE EXCEPTION 'Only administrators can modify review or verification fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_applicant_review_updates ON public.institution_applications;
CREATE TRIGGER trg_prevent_applicant_review_updates
BEFORE UPDATE ON public.institution_applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_applicant_review_field_updates();

-- 2. emergency_protocols: restrict to care relationship
DROP POLICY IF EXISTS "Emergency responders can view emergency protocols" ON public.emergency_protocols;
CREATE POLICY "Providers with care relationship can view emergency protocols"
ON public.emergency_protocols
FOR SELECT
USING (
  public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3. insurance_verifications: remove overly-broad ALL policy, scope by care relationship
DROP POLICY IF EXISTS "Admin staff can manage insurance verifications" ON public.insurance_verifications;

CREATE POLICY "Admins can manage insurance verifications"
ON public.insurance_verifications
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Providers with care relationship can manage insurance verifications"
ON public.insurance_verifications
FOR ALL
USING (public.has_care_relationship(auth.uid(), patient_id))
WITH CHECK (public.has_care_relationship(auth.uid(), patient_id));
