-- Stage C2b Cluster A — 2026-10-25
--
-- P3-4: broad table GRANTs that RLS still contains. Live grants verified
-- before writing: ai_chat_conversations / ai_chat_messages /
-- ai_diagnosis_history / provider_insurance_networks / analytics_events
-- held GRANT ALL (incl. TRUNCATE / REFERENCES / TRIGGER) for anon and/or
-- authenticated; service_pricing held GRANT ALL for authenticated.
-- RLS gated the rows, but a grant is the first wall: TRUNCATE in
-- particular ignores RLS entirely if it is ever combined with a future
-- policy mistake, and anon needs no access at all to the AI chat tables.
--
-- Least privilege consistent with actual app usage (src checked):
--   * ai_chat_conversations / ai_chat_messages — useAIChat.ts performs
--     SELECT / INSERT / UPDATE / DELETE as the signed-in user only.
--     anon: nothing. authenticated: exactly those four verbs.
--   * ai_diagnosis_history — policies are own-row SELECT / INSERT only.
--     anon: nothing. authenticated: SELECT, INSERT.
--   * provider_insurance_networks — no anon-facing flow; the read policy
--     is TO authenticated and writes are own-row / admin. anon: nothing.
--     authenticated: SELECT, INSERT, UPDATE, DELETE.
--   * service_pricing — read by signed-in clients; writes are performed
--     by institution / platform admins, who are also `authenticated`
--     (RLS + has_admin_scope() decides). The DML verbs must stay for
--     authenticated or the admin pricing UI breaks; the dangerous
--     non-PostgREST verbs (TRUNCATE / REFERENCES / TRIGGER) go.
--   * analytics_events — anonymous telemetry INSERT is by design (policy
--     "anon can insert anonymous analytics events", user_id IS NULL),
--     so anon keeps INSERT and loses everything else. authenticated
--     inserts own events and admins read them through the same role:
--     SELECT, INSERT stay; UPDATE / DELETE / TRUNCATE go (no policy and
--     no app flow ever updates or deletes an analytics event).
-- service_role keeps ALL everywhere (server paths unaffected).

REVOKE ALL ON TABLE public.ai_chat_conversations FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.ai_chat_conversations FROM authenticated;

REVOKE ALL ON TABLE public.ai_chat_messages FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.ai_chat_messages FROM authenticated;

REVOKE ALL ON TABLE public.ai_diagnosis_history FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.ai_diagnosis_history FROM authenticated;

REVOKE ALL ON TABLE public.provider_insurance_networks FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.provider_insurance_networks FROM authenticated;

REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.service_pricing FROM authenticated;

REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.analytics_events FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.analytics_events FROM authenticated;
