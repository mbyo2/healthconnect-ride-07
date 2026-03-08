
-- Fix permissive INSERT on login_security_log (uses email, not user_id)
DROP POLICY IF EXISTS "Anyone can insert login events" ON public.login_security_log;

-- Allow authenticated users to insert their own login events (match by email)
CREATE POLICY "Users can insert own login events" ON public.login_security_log
  FOR INSERT TO authenticated
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
