
-- 1) user_two_factor_secrets: ensure NO SELECT policy exists for authenticated users.
-- Only the totp-manage edge function (service_role) may read raw secrets.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_two_factor_secrets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_two_factor_secrets', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.user_two_factor_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_two_factor_secrets FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.user_two_factor_secrets TO service_role;

-- Explicit deny policy so any accidentally-added SELECT grant cannot expose rows.
CREATE POLICY "no client access to totp secrets"
  ON public.user_two_factor_secrets
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 2) analytics_events: allow anonymous page-view inserts (user_id IS NULL).
--    Authenticated inserts must still bind to auth.uid().
DROP POLICY IF EXISTS "anon can insert anonymous analytics events" ON public.analytics_events;
CREATE POLICY "anon can insert anonymous analytics events"
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

GRANT INSERT ON public.analytics_events TO anon;

-- 3) hospital_admissions: allow institution staff/admin of the hospital to read.
DROP POLICY IF EXISTS "Institution staff can view admissions" ON public.hospital_admissions;
CREATE POLICY "Institution staff can view admissions"
  ON public.hospital_admissions
  FOR SELECT
  TO authenticated
  USING (
    public.is_institution_staff_member(hospital_id)
    OR public.is_institution_admin(hospital_id)
  );

-- 4) provider_availability: allow authenticated users (patients) to read schedules.
DROP POLICY IF EXISTS "Authenticated users can read provider availability" ON public.provider_availability;
CREATE POLICY "Authenticated users can read provider availability"
  ON public.provider_availability
  FOR SELECT
  TO authenticated
  USING (true);
