-- Secure user lookup by email for staff management
-- ------------------------------------------------------------------
-- Allows institution admins to find user IDs by email when adding existing
-- users as staff. Returns only the ID (not PII) and is SECURITY DEFINER
-- so it bypasses RLS on auth.users safely.

CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_email(text) TO authenticated;
