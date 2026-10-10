-- Safe admin user deletion helpers.
-- Used by the `admin-delete-user` Edge Function (service_role only).
--
-- Design:
--   1. admin_delete_user_discover() returns every FK edge in public/auth/storage
--      so the Edge Function can build the full dependency graph dynamically
--      (ground truth = live DB, not migration files).
--   2. admin_delete_user_counts() runs the dry-run row counts.
--   3. admin_delete_user_execute() performs the ordered, transactional delete:
--      detach shared entities -> delete dependents (children first) ->
--      storage objects -> auth.identities -> auth.users.
--      Any failure rolls everything back (fail closed).
--
-- The two CEO accounts are hard-blocked here AND in the Edge Function AND UI.

-- ── 1. FK discovery ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user_discover()
RETURNS TABLE (
  table_schema text,
  table_name text,
  column_name text,
  ref_schema text,
  ref_table text,
  ref_column text,
  is_nullable boolean,
  delete_rule text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    nsp.nspname::text,
    cls.relname::text,
    att.attname::text,
    rnsp.nspname::text,
    rcls.relname::text,
    ratt.attname::text,
    (NOT att.attnotnull)::boolean,
    CASE con.confdeltype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE 'UNKNOWN'
    END::text
  FROM pg_constraint con
  JOIN pg_class cls      ON cls.oid = con.conrelid
  JOIN pg_namespace nsp  ON nsp.oid = cls.relnamespace
  JOIN pg_attribute att  ON att.attrelid = cls.oid AND att.attnum = con.conkey[1]
  JOIN pg_class rcls     ON rcls.oid = con.confrelid
  JOIN pg_namespace rnsp ON rnsp.oid = rcls.relnamespace
  JOIN pg_attribute ratt ON ratt.attrelid = rcls.oid AND ratt.attnum = con.confkey[1]
  WHERE con.contype = 'f'
    AND nsp.nspname IN ('public', 'auth', 'storage')
    AND NOT (cls.relname = 'spatial_ref_sys');
$$;

-- ── 2. Dry-run counts ────────────────────────────────────────────────────
-- p_steps: jsonb array of {schema, table, predicate}; predicate may use $1 for target uuid.
-- p_detach: jsonb array of {schema, table, column} for shared-entity detaches.
CREATE OR REPLACE FUNCTION public.admin_delete_user_counts(
  p_steps jsonb,
  p_target uuid,
  p_detach jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  table_name text,
  row_count bigint,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  step jsonb;
  cnt bigint;
BEGIN
  FOR step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %s',
      step->>'schema', step->>'table', step->>'predicate'
    ) INTO cnt USING p_target;
    table_name := (step->>'schema') || '.' || (step->>'table');
    row_count := cnt;
    action := 'delete';
    RETURN NEXT;
  END LOOP;
  FOR step IN SELECT * FROM jsonb_array_elements(p_detach)
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I = $1',
      step->>'schema', step->>'table', step->>'column'
    ) INTO cnt USING p_target;
    table_name := (step->>'schema') || '.' || (step->>'table');
    row_count := cnt;
    action := 'detach (set null)';
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ── 3. Transactional execute ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user_execute(
  p_steps jsonb,        -- [{schema, table, predicate}] in deletion order (children first)
  p_detach jsonb,       -- [{schema, table, column}] shared entities to SET NULL
  p_target uuid,
  p_actor uuid,
  p_target_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Storage objects owned by the user
  DELETE FROM storage.objects WHERE owner = p_target;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    report := report || jsonb_build_object(
      'table', 'storage.objects', 'action', 'deleted', 'rows', deleted_count
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
$$;

-- Lock down: only service_role (used by the Edge Function) may execute.
REVOKE ALL ON FUNCTION public.admin_delete_user_discover() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user_counts(jsonb, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user_execute(jsonb, jsonb, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_discover() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_counts(jsonb, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_execute(jsonb, jsonb, uuid, uuid, text) TO service_role;
