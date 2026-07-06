
-- billing_records
DROP POLICY IF EXISTS "Health personnel can insert billing records" ON public.billing_records;
CREATE POLICY "Health personnel can insert billing records"
  ON public.billing_records FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'health_personnel'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'nurse'::app_role)
    OR public.has_role(auth.uid(), 'pharmacist'::app_role)
    OR public.has_role(auth.uid(), 'lab_technician'::app_role)
    OR public.has_role(auth.uid(), 'radiologist'::app_role)
    OR public.has_role(auth.uid(), 'pathologist'::app_role)
    OR public.has_role(auth.uid(), 'specialist'::app_role)
    OR public.has_role(auth.uid(), 'billing_staff'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- health_articles
DROP POLICY IF EXISTS "Health personnel can create articles" ON public.health_articles;
CREATE POLICY "Health personnel can create articles"
  ON public.health_articles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'health_personnel'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'nurse'::app_role)
    OR public.has_role(auth.uid(), 'pharmacist'::app_role)
    OR public.has_role(auth.uid(), 'lab_technician'::app_role)
    OR public.has_role(auth.uid(), 'radiologist'::app_role)
    OR public.has_role(auth.uid(), 'pathologist'::app_role)
    OR public.has_role(auth.uid(), 'specialist'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- user_events
DROP POLICY IF EXISTS "Admins can view all events" ON public.user_events;
CREATE POLICY "Admins can view all events"
  ON public.user_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- realtime.messages: default-deny topic-scoped policies for authenticated users.
-- Only super admins can send/receive on unclaimed topics; feature-specific policies
-- should be added when private Broadcast/Presence channels are introduced.
DROP POLICY IF EXISTS "Super admins can read realtime messages" ON realtime.messages;
CREATE POLICY "Super admins can read realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can send realtime messages" ON realtime.messages;
CREATE POLICY "Super admins can send realtime messages"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
