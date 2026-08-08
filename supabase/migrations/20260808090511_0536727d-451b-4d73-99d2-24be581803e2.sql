
DO $$
DECLARE
  r record;
  trigger_only boolean;
  server_only boolean;
BEGIN
  FOR r IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS ret
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    trigger_only := (r.ret = 'trigger');
    server_only := r.proname IN (
      'process_refund_atomic',
      'process_payment_with_splits',
      'insert_applications_for_doctors',
      'get_staff_invitation_by_token'
    );

    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      r.proname, r.args
    );

    IF trigger_only OR server_only THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated',
        r.proname, r.args
      );
    ELSE
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        r.proname, r.args
      );
    END IF;

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      r.proname, r.args
    );
  END LOOP;
END $$;
