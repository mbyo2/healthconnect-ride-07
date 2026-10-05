-- Fix overbroad staff invitation SELECT policy (security)
-- The "Invitees can view pending invitations by token" policy allowed ANYONE
-- to SELECT ALL pending invitations (status='pending' AND not expired),
-- exposing every invitation token. The token filter was only in the app's
-- query, not enforced by RLS.
--
-- Fix: drop the overbroad policy; add SECURITY DEFINER function that takes
-- the token and returns ONLY that specific invitation. Frontend calls the
-- RPC instead of direct SELECT.

DROP POLICY IF EXISTS "Invitees can view pending invitations by token"
ON public.staff_invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  staff_role text,
  department_name text,
  specialty text,
  status text,
  expires_at timestamptz,
  institution_id uuid,
  institution_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    si.id,
    si.email,
    si.staff_role,
    si.department_name,
    si.specialty,
    si.status,
    si.expires_at,
    si.institution_id,
    hi.name AS institution_name
  FROM public.staff_invitations si
  JOIN public.healthcare_institutions hi ON hi.id = si.institution_id
  WHERE si.token = p_token
    AND si.status = 'pending'
    AND (si.expires_at IS NULL OR si.expires_at > now())
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_invitation_by_token(text) IS
  'Returns the single pending invitation matching the secret token. Used by the invitation acceptance flow.';
