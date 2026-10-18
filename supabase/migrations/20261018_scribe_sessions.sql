-- AI Ambient Scribe sessions
-- Stores consultation transcripts + AI-generated SOAP note drafts.
-- Drafts REQUIRE human (clinician) review before approval; approved notes
-- are the only ones treated as clinical records. Never auto-save AI output.
-- New table (2026-10-18); no drift risk.

CREATE TABLE IF NOT EXISTS public.scribe_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NULL,
  provider_id UUID NOT NULL,
  patient_id UUID NULL,
  transcript_text TEXT NOT NULL DEFAULT '',
  generated_notes JSONB NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('recording', 'processing', 'draft', 'approved', 'discarded')),
  patient_consented BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID NULL,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scribe_sessions_provider
  ON public.scribe_sessions (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_sessions_consultation
  ON public.scribe_sessions (consultation_id);

ALTER TABLE public.scribe_sessions ENABLE ROW LEVEL SECURITY;

-- Providers see their own sessions; patients see sessions about them.
DROP POLICY IF EXISTS "Users view own scribe sessions" ON public.scribe_sessions;
CREATE POLICY "Users view own scribe sessions"
ON public.scribe_sessions FOR SELECT TO authenticated
USING (
  provider_id = auth.uid()
  OR patient_id = auth.uid()
);

DROP POLICY IF EXISTS "Users create scribe sessions" ON public.scribe_sessions;
CREATE POLICY "Users create scribe sessions"
ON public.scribe_sessions FOR INSERT TO authenticated
WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Providers update own scribe sessions" ON public.scribe_sessions;
CREATE POLICY "Providers update own scribe sessions"
ON public.scribe_sessions FOR UPDATE TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

COMMENT ON TABLE public.scribe_sessions IS
  'AI ambient scribe sessions: consultation transcripts + AI-generated SOAP drafts. Drafts require clinician approval (approved status) before use as clinical records.';
