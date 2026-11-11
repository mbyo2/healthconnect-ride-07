-- 20261111_audit_trail_hardening.sql
-- Audit-trail hardening pack, 2026-11-11: implements the report-only fixes from
-- the audit-trail verification of the same day.
--
-- D3) security_events was the ONE audit table admins could fully manage via an
--     ALL policy (has_admin_scope()). Narrowed to SELECT + UPDATE (the
--     resolution fields resolved / resolved_at / resolved_by). No INSERT or
--     DELETE policy remains for API roles; the service role bypasses RLS.
--     The table held 0 rows at change time and the only client reader
--     (AdminDashboard) only SELECTs.
--
-- D2) Defence in depth on the real audit tables. Every database writer of
--     these tables is a SECURITY DEFINER function owned by postgres (role
--     trail, module entitlements, patient search RPCs, medical-record trigger,
--     approval loggers), so authenticated needs no write grants beyond the
--     two tightly-scoped client INSERT policies on security_audit_log
--     (marketplace approval requests/decisions), which are KEPT:
--       audit_logs:           REVOKE UPDATE/DELETE (INSERT kept: the
--                             CrossSystemExchange FHIR flow intends client
--                             audit inserts; the existing INSERT policy
--                             already gates them on is_service_role()).
--       security_audit_log:   REVOKE UPDATE/DELETE (client INSERT kept).
--       medical_record_audit: REVOKE INSERT/UPDATE/DELETE (writer is the
--                             SECURITY DEFINER hash-chain trigger only).
--       patient_access_audit: REVOKE INSERT/UPDATE/DELETE (writers are the
--                             SECURITY DEFINER search RPCs only; no client
--                             INSERT policy ever existed).
--     Plus immutability triggers on security_audit_log and
--     medical_record_audit, mirroring BMaGlass's p2p_block_mutation but
--     SCOPED TO API ROLES: they raise only when current_user is anon or
--     authenticated. Direct-SQL / service-role paths (admin tooling, the
--     QA teardown that deletes a purged user's audit rows) keep working —
--     proven live after this migration.
--
-- D5) Fee/pricing/config changes were not audit-logged. audit triggers in
--     the institution_module_entitlements pattern now write
--     commission_settings / service_pricing / institution_procedure_pricing
--     changes to security_audit_log with old/new payloads.
--
-- D4) Failed sign-ins were captured nowhere queryable: the client's
--     logSecurityEvent inserted directly into security_audit_log, which RLS
--     rejects (42501) for every client event type, and it returned early
--     when no session existed — exactly the failed-login case.
--     record_security_event() is an insert-only SECURITY DEFINER RPC,
--     execute-granted to anon + authenticated, that records the client's
--     security-event vocabulary into security_audit_log (and mirrors
--     login_attempt/login_failure into login_security_log when an email is
--     supplied, so failures surface in the SecurityManagement reader).

-- ── D3: security_events policy narrowing ─────────────────────────────
DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;

DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
CREATE POLICY "Admins can view all security events" ON public.security_events
  FOR SELECT TO public
  USING (has_admin_scope());

DROP POLICY IF EXISTS "Admins can resolve security events" ON public.security_events;
CREATE POLICY "Admins can resolve security events" ON public.security_events
  FOR UPDATE TO public
  USING (has_admin_scope())
  WITH CHECK (has_admin_scope());

-- ── D2: grant revokes (defence in depth behind RLS) ──────────────────
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.security_audit_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.medical_record_audit FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.patient_access_audit FROM authenticated;

-- ── D2: immutability triggers, scoped to API roles ───────────────────
CREATE OR REPLACE FUNCTION public.audit_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Mirrors BMaGlass's p2p_block_mutation, but scoped to API roles so
  -- service-role / direct-SQL maintenance (incl. QA user teardown, which
  -- deletes the purged user's audit rows) is not blocked.
  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Audit records are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_security_audit_log_mutation ON public.security_audit_log;
CREATE TRIGGER trg_block_security_audit_log_mutation
BEFORE UPDATE OR DELETE ON public.security_audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_block_mutation();

DROP TRIGGER IF EXISTS trg_block_medical_record_audit_mutation ON public.medical_record_audit;
CREATE TRIGGER trg_block_medical_record_audit_mutation
BEFORE UPDATE OR DELETE ON public.medical_record_audit
FOR EACH ROW EXECUTE FUNCTION public.audit_block_mutation();

-- ── D5: pricing / fee / config change logging ────────────────────────
CREATE OR REPLACE FUNCTION public.audit_pricing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.security_audit_log (user_id, event_type, event_data)
    VALUES (
      auth.uid(),
      TG_ARGV[0],
      jsonb_build_object(
        'op', TG_OP,
        'table', TG_TABLE_NAME,
        'old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_commission_settings ON public.commission_settings;
CREATE TRIGGER trg_audit_commission_settings
AFTER INSERT OR UPDATE OR DELETE ON public.commission_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_pricing_change('commission_settings_changed');

DROP TRIGGER IF EXISTS trg_audit_service_pricing ON public.service_pricing;
CREATE TRIGGER trg_audit_service_pricing
AFTER INSERT OR UPDATE OR DELETE ON public.service_pricing
FOR EACH ROW EXECUTE FUNCTION public.audit_pricing_change('service_pricing_changed');

DROP TRIGGER IF EXISTS trg_audit_institution_procedure_pricing ON public.institution_procedure_pricing;
CREATE TRIGGER trg_audit_institution_procedure_pricing
AFTER INSERT OR UPDATE OR DELETE ON public.institution_procedure_pricing
FOR EACH ROW EXECUTE FUNCTION public.audit_pricing_change('institution_procedure_pricing_changed');

-- ── D4: failed-sign-in / client security-event capture RPC ───────────
CREATE OR REPLACE FUNCTION public.record_security_event(
  p_event_type text,
  p_event_data jsonb DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_data jsonb := COALESCE(p_event_data, '{}'::jsonb);
BEGIN
  -- Allowlist = the client vocabulary in src/utils/security-service.ts
  -- (SecurityEvents). Anything else is refused, so the endpoint cannot
  -- be used to write arbitrary audit rows.
  IF p_event_type NOT IN (
    'login_attempt','login_success','login_failure','logout',
    'password_change','role_change','profile_update','unauthorized_access',
    'suspicious_activity','file_upload','message_sent','appointment_created',
    'data_access'
  ) THEN
    RAISE EXCEPTION 'unsupported security event type: %', p_event_type;
  END IF;

  IF p_email IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('attempted_email', p_email);
  END IF;

  INSERT INTO public.security_audit_log (user_id, event_type, event_data, user_agent)
  VALUES (auth.uid(), p_event_type, v_data, p_user_agent)
  RETURNING id INTO v_id;

  -- Mirror login attempts/failures into login_security_log so they are
  -- visible in the SecurityManagement reader next to successful sign-ins.
  IF p_event_type IN ('login_attempt', 'login_failure')
     AND p_email IS NOT NULL AND btrim(p_email) <> '' THEN
    INSERT INTO public.login_security_log (user_id, email, event_type, description, user_agent)
    VALUES (auth.uid(), p_email, p_event_type,
            'Recorded by client via record_security_event', p_user_agent);
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_security_event(text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_security_event(text, jsonb, text, text) TO anon, authenticated;
