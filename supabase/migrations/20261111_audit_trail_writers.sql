-- 20261111_audit_trail_writers.sql
-- Audit-trail verification, 2026-11-11: three audit tables/triggers existed on paper
-- but had no live writer. This migration adds purely-additive, exception-guarded
-- writers. Audit logging must never block the underlying action, so every function
-- swallows its own errors.
--
-- 1) login_security_log: table + RLS + an admin reader UI (SecurityManagement) existed,
--    but nothing wrote to it (0 rows ever). trg_log_user_signin now records each
--    successful sign-in (auth.users.last_sign_in_at change).
-- 2) medical_record_audit: hash-chained (payload_hash/prev_hash) record-change audit
--    existed with zero writers anywhere (no function, trigger or client code).
--    trg_medical_record_audit now writes a chained row for every
--    INSERT/UPDATE/DELETE on comprehensive_medical_records.
-- 3) institution_module_entitlements: module grants/revokes by admins were not
--    audit-logged. trg_module_entitlement_audit now writes them to
--    security_audit_log as event_type 'module_entitlement_changed'.
--
-- Proven live 2026-11-11: QA sign-in produced login_security_log row
-- b8aa600d-2473-46dc-990a-5b3478c3d1fe; a create/amend/delete cycle on a medical
-- record produced a 3-row hash chain in medical_record_audit; a probe module
-- entitlement grant + revoke produced 2 security_audit_log rows.
-- (All QA proof rows were removed with the QA teardown afterwards.)

CREATE OR REPLACE FUNCTION public.log_user_signin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.login_security_log (user_id, email, event_type, description)
    VALUES (NEW.id, NEW.email, 'login', 'Sign-in recorded by audit trigger trg_log_user_signin');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_user_signin ON auth.users;
CREATE TRIGGER trg_log_user_signin
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
WHEN (NEW.last_sign_in_at IS NOT NULL AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
EXECUTE FUNCTION public.log_user_signin();

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
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_record_audit ON public.comprehensive_medical_records;
CREATE TRIGGER trg_medical_record_audit
AFTER INSERT OR UPDATE OR DELETE ON public.comprehensive_medical_records
FOR EACH ROW EXECUTE FUNCTION public.audit_medical_record_change();

CREATE OR REPLACE FUNCTION public.audit_module_entitlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_module_entitlement_audit ON public.institution_module_entitlements;
CREATE TRIGGER trg_module_entitlement_audit
AFTER INSERT OR UPDATE OR DELETE ON public.institution_module_entitlements
FOR EACH ROW EXECUTE FUNCTION public.audit_module_entitlement_change();
