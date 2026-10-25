-- Stage CSP follow-up (P3-22 residual): violation REPORT COLLECTOR table.
--
-- Stage 1 (commit 880b5ee) deployed the hardened CSP as
-- Content-Security-Policy-Report-Only. The browser report-only pass
-- cannot be evidenced from DevTools console output (the browser tooling
-- cannot read it), so violations are collected server-side instead:
-- the report-only header now carries report-uri + report-to pointing at
-- the `csp-report` edge function (verify_jwt = false — browsers send
-- CSP reports unauthenticated), which parses both the modern Reporting
-- API format (application/reports+json, an array of {type, body}) and
-- the legacy report-uri format (application/csp-report,
-- {"csp-report": {...}}) and stores one row per report here.
--
-- Lockdown: RLS enabled with NO policies for anon/authenticated — the
-- only writer is the edge function via the service role (RLS bypass),
-- and reads happen via SQL (Management API) only. Table privileges are
-- also revoked from anon/authenticated/PUBLIC so PostgREST cannot reach
-- it at all. The enforcing CSP header is untouched by this stage.

CREATE TABLE IF NOT EXISTS public.csp_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  document_uri text,
  violated_directive text,
  effective_directive text,
  blocked_uri text,
  source_file text,
  line_number integer,
  disposition text,
  user_agent text,
  raw jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS csp_reports_received_at_idx
  ON public.csp_reports (received_at DESC);

ALTER TABLE public.csp_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.csp_reports FROM PUBLIC, anon, authenticated;
