-- 20261113140059_sweep_server_audit_writers_immutability_views.sql
-- Doc'O Clock sweep, fix mission 3 (server / security / data-layer), 2026-11-13.
-- Implements audit workstream C findings M1 (audit-writer silence), L1
-- (audit-table immutability), L2 (security_invoker views).
--
-- M1 ROOT CAUSE (proven live 2026-11-13): the writers were NOT broken.
-- A QA sign-in produced login_security_log row
-- 1cd47c51-0eeb-4deb-923b-5df41fd81bfb the same minute, so the insert path
-- (SECURITY DEFINER log_user_signin, correct columns, no blocking CHECK)
-- is healthy. The 0 rows were an absence of qualifying sign-ins after
-- the trigger was installed on 2026-11-11: the two sign-ins the audit
-- counted (mbyo2@proton.me 12:25, mabvutobanda@proton.me 17:09 UTC)
-- predate the install, and the 2026-11-11 QA proof rows were purged in
-- that day's teardown. The REAL defect is only the invisibility: every
-- writer swallows ALL exceptions (EXCEPTION WHEN OTHERS THEN NULL), so
-- the next failure would again be silent. Section A replaces the swallow
-- with: capture SQLSTATE/SQLERRM, RAISE WARNING (Postgres log), and a
-- best-effort dead-letter row in security_audit_log (event_type
-- 'audit_writer_failure'). The underlying action is still never blocked.
--
-- L1: immutability triggers (audit_block_mutation, scoped to API roles
-- anon/authenticated so service-role QA purges still work) on
-- login_security_log + security_events, plus grant revokes behind RLS:
-- authenticated loses UPDATE/DELETE on login_security_log (no client
-- UPDATE/DELETE policy exists) and DELETE on security_events. UPDATE on
-- security_events is KEPT: the admin-only "resolve" policy needs it.
--
-- L2: security_invoker=true on the 4 views that lacked it. A/B-PROBED
-- live 2026-11-13 and REVERTED — the flag REGRESSES all four views, so
-- it is DELIBERATELY NOT SET (no ALTER below). Evidence (flag ON vs OFF):
--   lab_results_patient_view as the QA patient: ON = 1 row (verified
--     only); OFF = 2 rows with the pending row's result_value NULL —
--     the designed "Pending verification" shell (PatientLabResults.tsx:
--     "returns all of the patient's own rows with value-bearing columns
--     NULL until the result is verified"). Underlying lab_results RLS
--     hides unverified rows entirely, so the flag removes the shell.
--   lab_tests_patient_view: same class (base-table patient SELECT is
--     verified-only at RLS).
--   provider_directory as anon: ON = 401 42501 "permission denied for
--     table profiles"; OFF = 200, 1 row. As the QA patient: ON = 0 rows;
--     OFF = 1 row. profiles has NO anon SELECT policy and patients see
--     only own/appointment profiles, so the flag empties the directory
--     the booking flow reads (PatientWorkflow, VideoConsultationBooking).
--   shareable_equipment as anon: ON = 401 42501 on asset_register;
--     OFF = 200 [] (0 live rows). Same class: asset_register SELECT is
--     institution-staff-only, so the flag would hide shared equipment
--     from every cross-institution browser — the view's purpose.
-- The views' own WHERE filters + column lists ARE the access control
-- over tables callers cannot read directly; that is the textbook case
-- for a security-definer view. A future revisit would need scoped
-- SELECT policies on profiles/asset_register first — not a bare flag.
--
-- L3 (record_security_event anon EXECUTE): KEEP, no change. The anon
-- grant is what lets unauthenticated failed-login calls be logged; the
-- 13-event allowlist bounds it and the function only writes (no reads).
-- Probed live 2026-11-13 (unauthenticated login_failure lands in both
-- security_audit_log and login_security_log).
--
-- RECONCILIATION (item 7): 2026-11-13 enumeration — 122 applied
-- versions in supabase_migrations.schema_migrations; 116 match a repo
-- file within 120s (Lovable pushes stamp the version ~1s before the
-- file timestamp). 6 applied versions have NO repo file at all:
-- 20250801075804, 20250902035428, 20250904043022, 20250904043118,
-- 20251001084303, 20251002030634 — their SQL is not recoverable from
-- the Management API (versions only); needs the Lovable-side history.
-- The 20261111 audit-writer/hardening files ARE filed and their live
-- function bodies match the repo files verbatim (checked 2026-11-13);
-- only their schema_migrations rows are missing, and their shared
-- 8-digit '20261111' prefix cannot serve as a CLI version (both files
-- would collide), so no row is faked for them. THIS file records its
-- own version row below so it does not add to that drift.
--
-- Idempotent: CREATE OR REPLACE / DROP ... IF EXISTS / ON CONFLICT DO
-- NOTHING throughout. Applied via ~/.qa-work/docsql.sh (Management API;
-- `supabase db push` cannot connect from this VM).

-- ── A. Visible-failure audit writers ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_user_signin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    INSERT INTO public.login_security_log (user_id, email, event_type, description)
    VALUES (NEW.id, NEW.email, 'login', 'Sign-in recorded by audit trigger trg_log_user_signin');
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
    v_msg := SQLERRM;
    RAISE WARNING 'audit writer log_user_signin failed: [%] %', v_state, v_msg;
    BEGIN
      INSERT INTO public.security_audit_log (user_id, event_type, event_data)
      VALUES (NEW.id, 'audit_writer_failure',
              jsonb_build_object('writer', 'log_user_signin', 'sqlstate', v_state, 'error', v_msg));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fallback must never propagate; the WARNING above is the visibility guarantee
    END;
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_medical_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id uuid;
  v_patient_id uuid;
  v_actor uuid;
  v_payload jsonb;
  v_prev_hash text;
  v_hash text;
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_record_id := OLD.id; v_patient_id := OLD.patient_id; v_payload := to_jsonb(OLD);
      v_actor := COALESCE(auth.uid(), OLD.provider_id);
    ELSE
      v_record_id := NEW.id; v_patient_id := NEW.patient_id; v_payload := to_jsonb(NEW);
      v_actor := COALESCE(auth.uid(), NEW.provider_id);
    END IF;
    SELECT payload_hash INTO v_prev_hash
    FROM public.medical_record_audit
    WHERE record_id = v_record_id
    ORDER BY created_at DESC
    LIMIT 1;
    v_hash := encode(extensions.digest(v_payload::text::bytea, 'sha256'), 'hex');
    INSERT INTO public.medical_record_audit (record_id, patient_id, actor_id, action, payload_hash, prev_hash, metadata)
    VALUES (v_record_id, v_patient_id, v_actor, TG_OP, v_hash, v_prev_hash,
            jsonb_build_object('source','trg_medical_record_audit','table', TG_TABLE_NAME));
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
    v_msg := SQLERRM;
    RAISE WARNING 'audit writer audit_medical_record_change failed: [%] %', v_state, v_msg;
    BEGIN
      INSERT INTO public.security_audit_log (user_id, event_type, event_data)
      VALUES (COALESCE(auth.uid(), v_actor), 'audit_writer_failure',
              jsonb_build_object('writer', 'audit_medical_record_change', 'sqlstate', v_state, 'error', v_msg, 'record_id', v_record_id));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fallback must never propagate; the WARNING above is the visibility guarantee
    END;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_module_entitlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    INSERT INTO public.security_audit_log (user_id, event_type, event_data)
    VALUES (
      COALESCE(auth.uid(), CASE WHEN TG_OP='DELETE' THEN OLD.granted_by ELSE NEW.granted_by END),
      'module_entitlement_changed',
      jsonb_build_object(
        'op', TG_OP,
        'institution_id', CASE WHEN TG_OP='DELETE' THEN OLD.institution_id ELSE NEW.institution_id END,
        'module_key', CASE WHEN TG_OP='DELETE' THEN OLD.module_key ELSE NEW.module_key END,
        'old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
    v_msg := SQLERRM;
    RAISE WARNING 'audit writer audit_module_entitlement_change failed: [%] %', v_state, v_msg;
    BEGIN
      INSERT INTO public.security_audit_log (user_id, event_type, event_data)
      VALUES (auth.uid(), 'audit_writer_failure',
              jsonb_build_object('writer', 'audit_module_entitlement_change', 'sqlstate', v_state, 'error', v_msg));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fallback must never propagate; the WARNING above is the visibility guarantee
    END;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_pricing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_msg text;
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
    v_state := SQLSTATE;
    v_msg := SQLERRM;
    RAISE WARNING 'audit writer audit_pricing_change failed: [%] %', v_state, v_msg;
    BEGIN
      INSERT INTO public.security_audit_log (user_id, event_type, event_data)
      VALUES (auth.uid(), 'audit_writer_failure',
              jsonb_build_object('writer', 'audit_pricing_change', 'sqlstate', v_state, 'error', v_msg, 'table', TG_TABLE_NAME));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- fallback must never propagate; the WARNING above is the visibility guarantee
    END;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── B. Immutability: mutation-block triggers + grant revokes ──────────
-- login_security_log: blanket block (no client UPDATE/DELETE policy
-- exists, so nothing legitimate is blocked).
DROP TRIGGER IF EXISTS trg_block_login_security_log_mutation ON public.login_security_log;
CREATE TRIGGER trg_block_login_security_log_mutation
BEFORE UPDATE OR DELETE ON public.login_security_log
FOR EACH ROW EXECUTE FUNCTION public.audit_block_mutation();

-- security_events: SCOPED block, not the blanket function. The table
-- carries an intentional admin-only UPDATE policy ("Admins can resolve
-- security events") and the blanket trigger demonstrably breaks it:
-- probed live 2026-11-13, an admin PATCH of resolved=true drew
-- 400 P0001 "Audit records are immutable". The scoped trigger below
-- still blocks DELETE outright and blocks UPDATE of every column
-- except the resolution fields (resolved, resolved_at, resolved_by);
-- RLS still gates WHO may resolve (admin-only policy).
CREATE OR REPLACE FUNCTION public.audit_block_security_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Audit records are immutable';
    END IF;
    IF OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.type IS DISTINCT FROM NEW.type
       OR OLD.severity IS DISTINCT FROM NEW.severity
       OR OLD.event_data IS DISTINCT FROM NEW.event_data
       OR OLD.ip_address IS DISTINCT FROM NEW.ip_address
       OR OLD.user_agent IS DISTINCT FROM NEW.user_agent
       OR OLD.created_at IS DISTINCT FROM NEW.created_at
       OR OLD.timestamp IS DISTINCT FROM NEW.timestamp THEN
      RAISE EXCEPTION 'Audit records are immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_security_events_mutation ON public.security_events;
CREATE TRIGGER trg_block_security_events_mutation
BEFORE UPDATE OR DELETE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION public.audit_block_security_event_mutation();

REVOKE UPDATE, DELETE ON public.login_security_log FROM authenticated;
REVOKE DELETE ON public.security_events FROM authenticated;

-- ── C. Views: security_invoker deliberately NOT set ──────────────────
-- (A/B-probed live 2026-11-13: setting it regresses all four views —
-- see header. The views stay security-definer; no ALTER here, so this
-- file matches live exactly.)

-- ── D. Record this migration as applied (repo/live history agreement) ─
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20261113140059')
ON CONFLICT (version) DO NOTHING;
