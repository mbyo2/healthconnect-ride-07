-- ============================================================================
-- Support ticket system (real ticket management for the support role).
-- Previously the support role only had navigation links — no way to
-- actually manage support tickets.
--
-- SECURITY MODEL:
--  1. Any authenticated user can CREATE a ticket and view their OWN.
--  2. support / admin / super_admin platform roles can view/update ALL
--     tickets and assign them.
--  3. Ticket messages: the ticket creator, assigned support staff, and
--     platform roles can read; anyone who can read can post.
--  4. All cross-table role checks go through SECURITY DEFINER helpers
--     (public.has_role) — never inline EXISTS in policies (RLS recursion
--     rule, see AGENTS.md).
--  5. No DELETE on tickets or messages — the history is the audit trail.
-- ============================================================================

-- 1. Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'technical'
    CHECK (category IN ('technical','billing','account','other')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_institution ON public.support_tickets(institution_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a support-capable platform role? (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_support_staff(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(p_user_id, 'support'::app_role)
    OR public.has_role(p_user_id, 'admin'::app_role)
    OR public.has_role(p_user_id, 'super_admin'::app_role)
$$;

-- INSERT: any authenticated user can open a ticket for themselves.
DROP POLICY IF EXISTS "Users can open support tickets" ON public.support_tickets;
CREATE POLICY "Users can open support tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND status = 'open');

-- SELECT: own tickets, or all for support staff.
DROP POLICY IF EXISTS "Users view own tickets, support views all" ON public.support_tickets;
CREATE POLICY "Users view own tickets, support views all"
ON public.support_tickets FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_support_staff(auth.uid())
);

-- UPDATE: support staff can update anything (assign, change status/priority);
-- ticket creators may only close their own open tickets.
DROP POLICY IF EXISTS "Support staff manage tickets" ON public.support_tickets;
CREATE POLICY "Support staff manage tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.is_support_staff(auth.uid()))
WITH CHECK (public.is_support_staff(auth.uid()));

DROP POLICY IF EXISTS "Creators close own tickets" ON public.support_tickets;
CREATE POLICY "Creators close own tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND status IN ('open','in_progress'))
WITH CHECK (created_by = auth.uid() AND status = 'closed');

-- No DELETE policy: ticket history is the audit trail.

-- Keep updated_at fresh.
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. Ticket messages (conversation thread per ticket)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Helper: can this user see this ticket? (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.can_view_support_ticket(p_ticket_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = p_ticket_id
      AND (t.created_by = p_user_id OR public.is_support_staff(p_user_id))
  );
$$;

-- SELECT: ticket creator + support staff.
DROP POLICY IF EXISTS "Ticket parties view messages" ON public.support_ticket_messages;
CREATE POLICY "Ticket parties view messages"
ON public.support_ticket_messages FOR SELECT TO authenticated
USING (public.can_view_support_ticket(ticket_id, auth.uid()));

-- INSERT: same parties can reply.
DROP POLICY IF EXISTS "Ticket parties post messages" ON public.support_ticket_messages;
CREATE POLICY "Ticket parties post messages"
ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.can_view_support_ticket(ticket_id, auth.uid())
);

-- No UPDATE / DELETE: messages are immutable history.
