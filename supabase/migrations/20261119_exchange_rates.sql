-- Exchange rates — server-side FX for Doc'O Clock.
--
-- Rates that affect money come from the server, never from a client
-- fetch or a hard-coded constant (the same principle as server-side
-- tax resolution). This migration creates the store the
-- fetch-exchange-rates edge function refreshes every 10 minutes via
-- pg_cron + pg_net; the client service reads the latest valid rows
-- from here, and charge paths refuse when no fresh server rate exists.
--
-- ZMW is the platform's canonical currency. Rows carry every ZMW pair
-- in both directions (ZMW -> X for display, X -> ZMW for top-ups and
-- the PayPal gateway conversion), derived from a single USD-base feed
-- so the two directions can never disagree.
--
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL,
  source text NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_rate_positive CHECK (rate > 0),
  CONSTRAINT exchange_rates_pair_distinct CHECK (from_currency <> to_currency)
);

CREATE INDEX IF NOT EXISTS exchange_rates_lookup_idx
  ON public.exchange_rates (from_currency, to_currency, valid_from DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Rates are public reference data: readable by everyone, writable
-- only by the service role (the refresh edge function). No write
-- policies exist for anon/authenticated, so RLS denies their writes.
DROP POLICY IF EXISTS "Exchange rates are readable by everyone" ON public.exchange_rates;
CREATE POLICY "Exchange rates are readable by everyone"
  ON public.exchange_rates FOR SELECT
  TO anon, authenticated
  USING (true);

-- Explicit scoped grants (CEO Supabase grant rule, 2026-10-28).
GRANT SELECT ON public.exchange_rates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exchange_rates TO service_role;

-- This project's default privileges blanket-grant new public tables
-- to anon/authenticated (including TRUNCATE, which bypasses RLS
-- entirely). Strip everything but the intended grants so the live
-- privilege state matches this file exactly. (Applied and verified
-- live 2026-11-19: without this block anon/authenticated held full
-- INSERT/UPDATE/DELETE/TRUNCATE on the new table.)
REVOKE ALL PRIVILEGES ON public.exchange_rates FROM anon, authenticated;
GRANT SELECT ON public.exchange_rates TO anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.exchange_rates FROM service_role;

-- Refresh schedule: every 10 minutes, pg_cron invokes the
-- fetch-exchange-rates edge function via pg_net (the platform's
-- established cron -> edge-function bridge).
--
-- NOTE: the Authorization bearer below is intentionally a REDACTED
-- placeholder in the repo. The real service-role JWT is set when this
-- migration is applied (out-of-band, as with BMaGlass Pay's cron
-- bridges). The function authenticates the caller by comparing the
-- bearer against its own SUPABASE_SERVICE_ROLE_KEY.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-exchange-rates-refresh') THEN
    PERFORM cron.unschedule('fetch-exchange-rates-refresh');
  END IF;
END $$;

SELECT cron.schedule(
  'fetch-exchange-rates-refresh',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tthzcijscedgxjfnfnky.supabase.co/functions/v1/fetch-exchange-rates',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service-role-jwt-redacted-set-at-apply-time>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
