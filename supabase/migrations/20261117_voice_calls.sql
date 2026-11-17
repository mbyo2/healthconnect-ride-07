-- In-app voice calls (group 2, inapp-chat/calls).
-- Signalling itself runs over Supabase Realtime broadcast on a per-call
-- channel named with the unguessable call UUID; this table is the durable
-- call record (ringing / accepted / ended / declined / missed) and the
-- authorisation anchor: a callee only accepts a ring after reading this
-- row, which RLS restricts to the two participants.
-- RLS uses plain auth.uid() = caller_id / callee_id checks only — no
-- inline EXISTS against other RLS tables (see AGENTS.md recursion lesson).
CREATE TABLE IF NOT EXISTS public.voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ringing'
    CHECK (status IN ('ringing', 'accepted', 'ended', 'declined', 'missed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT voice_calls_distinct_participants CHECK (caller_id <> callee_id)
);

ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call participants can view their calls"
  ON public.voice_calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Callers can start calls"
  ON public.voice_calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Call participants can update their calls"
  ON public.voice_calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

GRANT SELECT, INSERT, UPDATE ON public.voice_calls TO authenticated;
