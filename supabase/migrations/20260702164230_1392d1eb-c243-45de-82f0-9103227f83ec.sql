-- Restrict analytics_events INSERT to authenticated users only
DROP POLICY IF EXISTS "Insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert their analytics events"
ON public.analytics_events FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Restrict job_applications: institution admins can view applications for their postings
CREATE POLICY "Institution admins can view applications for their postings"
ON public.job_applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_postings jp
    JOIN public.healthcare_institutions hi ON hi.id = jp.institution_id
    WHERE jp.id = job_applications.job_posting_id
      AND hi.admin_id = auth.uid()
  )
);

-- Also allow applicants to view their own applications
CREATE POLICY "Applicants can view their own applications"
ON public.job_applications FOR SELECT TO authenticated
USING (applicant_id = auth.uid());