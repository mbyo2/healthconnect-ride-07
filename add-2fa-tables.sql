-- ============================================================================
-- SUPERSEDED — DO NOT RUN. This is a historical one-off schema script kept
-- for reference only. It is NOT part of the migration path (supabase/migrations/)
-- and parts of it predate the 2026-10 security hardening — several policies in
-- it use shapes (e.g. USING(true)) that were deliberately removed live.
-- Running it against production would RE-OPEN closed audit findings (P3-23).
-- ============================================================================
-- ============================================================================
-- ADD 2FA SECRETS TABLE (Required for TOTP functionality)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create user_two_factor_secrets table to store TOTP secrets securely
CREATE TABLE IF NOT EXISTS public.user_two_factor_secrets (
  user_id uuid NOT NULL PRIMARY KEY,
  secret text NOT NULL,
  backup_codes text[] NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_two_factor_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own 2FA secrets
CREATE POLICY "Users can access their own 2FA secrets"
ON public.user_two_factor_secrets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_two_factor_secrets_user_id ON public.user_two_factor_secrets(user_id);

-- Add trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_user_two_factor_secrets_updated_at'
  ) THEN
    CREATE TRIGGER update_user_two_factor_secrets_updated_at
    BEFORE UPDATE ON public.user_two_factor_secrets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;
