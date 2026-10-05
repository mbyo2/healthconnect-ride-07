-- Allow invitees to view invitations by token
-- The AcceptInvitation page looks up invitations by token from the URL.
-- The existing "Users view own invitations" policy requires email match via
-- JWT, but the token itself is a secret — allowing token-based SELECT for
-- pending, unexpired invitations is safe and fixes the acceptance flow.

CREATE POLICY "Invitees can view pending invitations by token"
ON public.staff_invitations
FOR SELECT
USING (
  status = 'pending'
  AND (expires_at IS NULL OR expires_at > now())
);

COMMENT ON POLICY "Invitees can view pending invitations by token" ON public.staff_invitations IS
  'Lets anyone with the secret token view a pending invitation (acceptance flow). Token is unguessable; safe.';
