-- Stage C2a (Cluster C) — 2026-10-25
--
-- P2-23: no rate limiting on any AI edge function. Any authenticated
-- account could burn the platform's AI provider budget unbounded
-- (ambient-scribe, doc-chat, med-ai, medgemma-3d-imaging, medgemma-chat,
-- medgemma-document-analysis, medgemma-health-analysis,
-- ocr-insurance-card, triage-assess).
--
-- Design: a per-user, per-function sliding window enforced by ONE
-- SECURITY DEFINER accessor over a deny-all table.
--   * ai_rate_limit_events: raw hit log. RLS enabled with NO policies
--     and privileges revoked from anon/authenticated/PUBLIC — the only
--     writer/reader is the DEFINER function (and service_role).
--   * ai_rate_limit_hit(p_user_id, p_function_name, p_limit,
--     p_window_seconds) -> boolean: counts the caller's hits inside the
--     window; when the limit is already reached it records nothing and
--     returns false (caller must answer 429); otherwise it records the
--     hit and returns true. Expired rows for the (user, function) pair
--     are pruned on each allowed hit so the table stays small.
--   * EXECUTE is service_role-only: edge functions call it with their
--     service-role client AFTER they have authenticated the caller, so
--     the user id is server-verified, never client-supplied to the RPC
--     by a browser. (P2-16 lesson: revoke the default PUBLIC grant
--     explicitly — a fresh CREATE FUNCTION inherits it.)

CREATE TABLE IF NOT EXISTS public.ai_rate_limit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_rate_limit_events_lookup
  ON public.ai_rate_limit_events (user_id, function_name, created_at DESC);

ALTER TABLE public.ai_rate_limit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_rate_limit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.ai_rate_limit_events TO service_role;

CREATE OR REPLACE FUNCTION public.ai_rate_limit_hit(
  p_user_id uuid,
  p_function_name text,
  p_limit int,
  p_window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz := now() - make_interval(secs => p_window_seconds);
  v_count int;
BEGIN
  IF p_user_id IS NULL OR p_function_name IS NULL
     OR p_limit IS NULL OR p_limit < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ai_rate_limit_events
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND created_at > v_window_start;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_rate_limit_events (user_id, function_name)
  VALUES (p_user_id, p_function_name);

  -- Opportunistic prune of this pair's expired rows.
  DELETE FROM public.ai_rate_limit_events
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND created_at <= v_window_start;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_rate_limit_hit(uuid, text, int, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_rate_limit_hit(uuid, text, int, int)
  TO service_role;
