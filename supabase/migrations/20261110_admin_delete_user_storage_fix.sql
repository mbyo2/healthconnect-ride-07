-- 20261110_admin_delete_user_storage_fix.sql — live-proven 2026-11-10.
--
-- PROBLEM: admin_delete_user_execute() (migration 20261010, applied live
-- 2026-11-10 after being found absent since 2026-10-25) could never
-- complete: its `DELETE FROM storage.objects WHERE owner = p_target`
-- always raises 42501 — Supabase's storage.protect_delete() trigger
-- forbids direct SQL deletion from storage tables ("Use the Storage API
-- instead"). Every user deletion therefore failed and rolled back,
-- including the QA-victim proof delete (error surfaced by calling the
-- RPC directly; the edge function correctly returns only a generic
-- message to the client).
--
-- FIX: drop the direct storage DELETE. The RPC now COUNTS the user's
-- storage objects and reports them as retained ("delete via Storage
-- API") instead of failing the whole transaction. The edge function
-- does not enumerate buckets, so purging a deleted user's objects is
-- a separate Storage-API step — recorded as a residual, not silently
-- dropped: the report lists the retained count.
--
-- AMENDMENT (same day, same proof session): a final security_audit_log
-- sweep before deleting auth.users. Deleting user_roles rows fires the
-- role-audit trigger, which INSERTS fresh audit rows for the target
-- AFTER the steps already swept that table — without this sweep the
-- final DELETE FROM auth.users fails on security_audit_log_user_id_fkey
-- (live-proven 2026-11-10). The RPC's own audit row belongs to the
-- actor, not the target, so it is unaffected.
--
-- Live baseline (2026-11-10, before apply): execute() raises 42501 on
-- any target (proven by direct RPC call). Target: delete of a user
-- with no storage objects succeeds end-to-end via the edge function.

CREATE OR REPLACE FUNCTION public.admin_delete_user_execute(
  p_steps jsonb,
  p_detach jsonb,
  p_target uuid,
  p_actor uuid,
  p_target_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  step jsonb;
  deleted_count bigint;
  report jsonb := '[]'::jsonb;
  actual_email text;
  total_rows bigint := 0;
BEGIN
  -- Defense in depth: re-verify identity inside the transaction
  SELECT email INTO actual_email FROM auth.users WHERE id = p_target;
  IF actual_email IS NULL THEN
    RAISE EXCEPTION 'User % does not exist', p_target;
  END IF;
  IF actual_email <> p_target_email THEN
    RAISE EXCEPTION 'Email mismatch (expected %, found %) — refusing to delete',
      p_target_email, actual_email;
  END IF;
  IF actual_email IN ('mbyo2@gmail.com', 'kondwaninyirenda99@gmail.com') THEN
    RAISE EXCEPTION 'Account % is protected and cannot be deleted', actual_email;
  END IF;
  IF p_target = p_actor THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  -- Audit log BEFORE deleting (this row belongs to the actor, so it survives)
  INSERT INTO public.security_audit_log (user_id, event_type, event_data)
  VALUES (
    p_actor,
    'admin_user_delete',
    jsonb_build_object(
      'target_user_id', p_target,
      'target_email', actual_email,
      'deleted_at', now()
    )
  );

  -- Detach shared entities (SET NULL) — e.g. institution admin
  FOR step IN SELECT * FROM jsonb_array_elements(p_detach)
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = NULL WHERE %I = $1',
      step->>'schema', step->>'table', step->>'column', step->>'column'
    ) USING p_target;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      report := report || jsonb_build_object(
        'table', (step->>'schema') || '.' || (step->>'table'),
        'action', 'detached (set null)',
        'rows', deleted_count
      );
      total_rows := total_rows + deleted_count;
    END IF;
  END LOOP;

  -- Ordered deletes (children before parents)
  FOR step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE %s',
      step->>'schema', step->>'table', step->>'predicate'
    ) USING p_target;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      report := report || jsonb_build_object(
        'table', (step->>'schema') || '.' || (step->>'table'),
        'action', 'deleted',
        'rows', deleted_count
      );
      total_rows := total_rows + deleted_count;
    END IF;
  END LOOP;

  -- Storage objects: direct SQL deletion is FORBIDDEN by the platform
  -- (storage.protect_delete() raises 42501 — "Use the Storage API
  -- instead"), and the old DELETE here failed every user deletion.
  -- Count and report them as retained; purge via the Storage API when
  -- a bucket cleanup is needed. Never let this step fail the delete.
  SELECT count(*) INTO deleted_count FROM storage.objects WHERE owner = p_target;
  IF deleted_count > 0 THEN
    report := report || jsonb_build_object(
      'table', 'storage.objects',
      'action', 'retained — delete via Storage API',
      'rows', deleted_count
    );
  END IF;

  -- Final audit sweep: deleting user_roles rows fires the role-audit
  -- trigger, which INSERTS fresh security_audit_log rows for the target
  -- AFTER the steps already swept that table. Without this sweep the
  -- final DELETE FROM auth.users fails on security_audit_log_user_id_fkey.
  -- (The RPC's own audit row belongs to the actor, not the target, so
  -- it is unaffected.)
  DELETE FROM public.security_audit_log WHERE user_id = p_target;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    report := report || jsonb_build_object(
      'table', 'public.security_audit_log',
      'action', 'deleted (final sweep)',
      'rows', deleted_count
    );
    total_rows := total_rows + deleted_count;
  END IF;

  -- Auth identities, then profile, then the auth user itself.
  -- If any FK was missed, this raises and the whole transaction rolls back.
  DELETE FROM auth.identities WHERE user_id = p_target;
  DELETE FROM public.profiles WHERE id = p_target;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    report := report || jsonb_build_object(
      'table', 'public.profiles', 'action', 'deleted', 'rows', deleted_count
    );
    total_rows := total_rows + deleted_count;
  END IF;
  DELETE FROM auth.users WHERE id = p_target;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'auth.users row for % was not deleted — aborting', p_target;
  END IF;
  report := report || jsonb_build_object(
    'table', 'auth.users', 'action', 'deleted', 'rows', deleted_count
  );
  total_rows := total_rows + deleted_count;

  RETURN jsonb_build_object(
    'target_user_id', p_target,
    'target_email', actual_email,
    'deleted_by', p_actor,
    'total_rows_affected', total_rows,
    'details', report
  );
END;
$function$;

-- CREATE OR REPLACE preserves the existing ACL; re-assert service_role-only.
REVOKE ALL ON FUNCTION public.admin_delete_user_execute(jsonb, jsonb, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_execute(jsonb, jsonb, uuid, uuid, text) TO service_role;
