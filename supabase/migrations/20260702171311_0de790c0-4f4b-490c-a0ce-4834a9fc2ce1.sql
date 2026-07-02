
-- 1) analytics_events: block anon inserts explicitly (defense in depth)
DROP POLICY IF EXISTS "Anon can insert analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Anonymous can insert analytics" ON public.analytics_events;
REVOKE INSERT ON public.analytics_events FROM anon;

-- 2) institution_staff: hide cross-staff PII (email, phone) from peers.
-- Replace broad "admins can view staff" with column-scoped access via a view for peers.
-- Simplest hardening: restrict SELECT so only institution admins and the staff member themselves can read the row.
DROP POLICY IF EXISTS "Staff members can view other staff in same institution" ON public.institution_staff;
DROP POLICY IF EXISTS "Peers can view same-institution staff" ON public.institution_staff;

-- Safe minimal directory view for peers (no email/phone)
CREATE OR REPLACE VIEW public.institution_staff_directory
WITH (security_invoker = true) AS
SELECT id, institution_id, provider_id, role, department, specialty,
       is_active, start_date, hired_date
FROM public.institution_staff;

GRANT SELECT ON public.institution_staff_directory TO authenticated;

-- 3) patient_queue: enforce provider-only inserts via role check
DROP POLICY IF EXISTS "Providers manage their queue" ON public.patient_queue;
DROP POLICY IF EXISTS "Providers can manage their queue" ON public.patient_queue;

CREATE POLICY "Providers manage their queue"
ON public.patient_queue
FOR ALL
TO authenticated
USING (auth.uid() = provider_id)
WITH CHECK (
  auth.uid() = provider_id
  AND (
    public.has_role(auth.uid(), 'doctor')
    OR public.has_role(auth.uid(), 'nurse')
    OR public.has_role(auth.uid(), 'health_personnel')
    OR public.has_role(auth.uid(), 'receptionist')
    OR public.has_role(auth.uid(), 'triage_staff')
    OR public.has_role(auth.uid(), 'institution_admin')
    OR public.has_role(auth.uid(), 'institution_staff')
    OR public.has_role(auth.uid(), 'specialist')
  )
);

-- 4) healthcare_institutions: require authentication for public directory
DROP POLICY IF EXISTS "Public can view verified institutions" ON public.healthcare_institutions;
CREATE POLICY "Authenticated users view verified institutions"
ON public.healthcare_institutions
FOR SELECT
TO authenticated
USING (is_verified = true);
REVOKE SELECT ON public.healthcare_institutions FROM anon;

-- 5) video_consultations: require participant on insert
DROP POLICY IF EXISTS "Authenticated users can create video consultations" ON public.video_consultations;
DROP POLICY IF EXISTS "Users can create video consultations" ON public.video_consultations;
CREATE POLICY "Participants create video consultations"
ON public.video_consultations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = patient_id OR auth.uid() = provider_id);

-- 6) user_two_factor: explicitly block non-owner reads (including admins) from raw secrets
DROP POLICY IF EXISTS "Admins can view 2FA" ON public.user_two_factor;
DROP POLICY IF EXISTS "Admins can read user_two_factor" ON public.user_two_factor;
-- Ensure only owner SELECT policy remains
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_two_factor'
      AND cmd='SELECT' AND policyname='Users can view own 2FA'
  ) THEN
    CREATE POLICY "Users can view own 2FA"
      ON public.user_two_factor FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
REVOKE SELECT ON public.user_two_factor FROM anon;
