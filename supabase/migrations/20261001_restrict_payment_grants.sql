-- Restrict execute grants on SECURITY DEFINER payment functions.
--
-- Problem found 2026-10-01: public.process_full_payment() is SECURITY DEFINER
-- (runs with elevated privileges) but had no REVOKE/GRANT restrictions,
-- meaning any database role could execute it. This migration restricts
-- execution to authenticated users only. The function's internal
-- authorization checks (wallet ownership, idempotency) remain the
-- primary security boundary.
-- Idempotent; safe to re-run.

DO $$
DECLARE
  v_func_oid OID;
BEGIN
  -- process_full_payment(UUID, UUID, NUMERIC, TEXT, UUID, TEXT, TEXT, TEXT, TEXT)
  SELECT oid INTO v_func_oid
  FROM pg_proc
  WHERE proname = 'process_full_payment'
    AND pronamespace = 'public'::regnamespace;

  IF v_func_oid IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.process_full_payment(UUID, UUID, NUMERIC, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.process_full_payment(UUID, UUID, NUMERIC, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
  END IF;
END $$;
