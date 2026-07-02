
-- 1) analytics_events: require user_id = auth.uid() for authenticated inserts (no NULL)
DROP POLICY IF EXISTS "Authenticated users can insert their analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert their analytics events"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2) departments: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Users can view departments" ON public.departments;
CREATE POLICY "Authenticated users can view departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) hospital_billing: add staff INSERT/UPDATE/DELETE scoped to institution
CREATE POLICY "Institution admins manage hospital billing"
  ON public.hospital_billing
  FOR ALL
  TO authenticated
  USING (
    public.is_institution_admin(hospital_id)
    OR public.is_institution_staff(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_institution_admin(hospital_id)
    OR public.is_institution_staff(hospital_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 4) login_security_log: add user_id column and switch RLS to user_id = auth.uid()
ALTER TABLE public.login_security_log
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.login_security_log l
  SET user_id = u.id
  FROM auth.users u
  WHERE l.user_id IS NULL AND lower(u.email) = lower(l.email);

CREATE INDEX IF NOT EXISTS idx_login_security_log_user_id ON public.login_security_log(user_id);

DROP POLICY IF EXISTS "Users can insert own login events" ON public.login_security_log;
DROP POLICY IF EXISTS "Users can view own login events" ON public.login_security_log;

CREATE POLICY "Users can insert own login events"
  ON public.login_security_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own login events"
  ON public.login_security_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
