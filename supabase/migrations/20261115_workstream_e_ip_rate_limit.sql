-- Workstream E (security audit 2026-11-15) — per-source-IP rate limiting
-- for unauthenticated webhook ingress.
--
-- Finding (live-proven): lenco-webhook and lenco-webhook-relay answer
-- every forged/invalid-signature POST with 401 and never throttle:
-- 10/10 invalid-signature deliveries in ~7s, 0x429. Each hit costs a
-- function invocation + HMAC verify (and, via the relay, a fan-out to
-- both apps), so a single source can burn invocations unbounded.
-- The AI limiter (ai_rate_limit_hit, 20261025) keys on a uuid user id
-- and cannot key an unauthenticated source, so this adds the same
-- sliding-window design keyed on a text source key (client IP).
--
-- Design (mirrors 20261025_stagec2a_c_ai_rate_limit.sql):
--   * ip_rate_limit_events: raw hit log. RLS enabled with NO policies
--     and privileges revoked from anon/authenticated/PUBLIC — the only
--     writer/reader is the DEFINER function (and service_role).
--   * ip_rate_limit_hit(p_key, p_function_name, p_limit,
--     p_window_seconds) -> boolean: counts hits inside the window;
--     at the limit it records nothing and returns false (caller must
--     answer 429); otherwise it records the hit and returns true.
--     Expired rows for the (key, function) pair are pruned on each
--     allowed hit so the table stays small.
--   * EXECUTE is service_role-only (P2-16 lesson: revoke the default
--     PUBLIC grant explicitly). Callers fail OPEN on RPC error — the
--     limiter is flood protection, never a settlement gate; a limiter
--     outage must not block real Lenco deliveries.

CREATE TABLE IF NOT EXISTS public.ip_rate_limit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key text NOT NULL,
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ip_rate_limit_events_lookup
  ON public.ip_rate_limit_events (source_key, function_name, created_at DESC);

ALTER TABLE public.ip_rate_limit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ip_rate_limit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.ip_rate_limit_events TO service_role;

CREATE OR REPLACE FUNCTION public.ip_rate_limit_hit(
  p_key text,
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
  IF p_key IS NULL OR p_key = ''
     OR p_function_name IS NULL
     OR p_limit IS NULL OR p_limit < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ip_rate_limit_events
  WHERE source_key = p_key
    AND function_name = p_function_name
    AND created_at > v_window_start;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ip_rate_limit_events (source_key, function_name)
  VALUES (p_key, p_function_name);

  -- Opportunistic prune of this pair's expired rows.
  DELETE FROM public.ip_rate_limit_events
  WHERE source_key = p_key
    AND function_name = p_function_name
    AND created_at <= v_window_start;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ip_rate_limit_hit(text, text, int, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ip_rate_limit_hit(text, text, int, int)
  TO service_role;
