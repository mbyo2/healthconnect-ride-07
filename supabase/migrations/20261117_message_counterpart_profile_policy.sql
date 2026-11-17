-- F1 (phase-1 baseline, 2026-11-17): ChatList showed "No conversations yet"
-- for message-only pairs. Two users with only messages between them could
-- exchange messages (proven live, both directions + realtime), but the
-- profiles SELECT policies exposed a counterpart only via
-- appointment/delivery/lab/institution links, so ChatList's profile fetch
-- returned [] and /chat?receiver=<id> toasted "user was not found". The
-- thread only became visible once a real appointment existed.
--
-- DECISION: yes, a message counterpart may see the other's profile — narrowly.
-- A user sees a profile only where a messages row already exists with the
-- viewer as sender or receiver. That is NOT enumeration: no message row, no
-- visibility, and the exposed columns are the same minimal set ChatList
-- already selects (id, first_name, last_name, avatar_url, role). The only
-- new exposure is to someone the viewer already messaged, who can already
-- see the viewer's messages to them. Same shape as the appointment /
-- delivery / lab link policies.
--
-- Pattern mirrors public.user_shares_appointment_with exactly: a SECURITY
-- DEFINER helper (opaque to the RLS rewriter, bypasses RLS on messages
-- inside), never an inline EXISTS against another RLS table in a profiles
-- policy (see AGENTS.md recursion lesson).
CREATE OR REPLACE FUNCTION public.user_shares_message_with(viewer_id uuid, other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE (m.sender_id = viewer_id AND m.receiver_id = other_id)
       OR (m.sender_id = other_id AND m.receiver_id = viewer_id)
  )
$$;

GRANT EXECUTE ON FUNCTION public.user_shares_message_with(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Message counterparts can view each other's profiles"
  ON public.profiles FOR SELECT
  USING ((id = auth.uid()) OR user_shares_message_with(auth.uid(), id));
