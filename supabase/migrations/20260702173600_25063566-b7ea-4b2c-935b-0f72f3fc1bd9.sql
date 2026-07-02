
-- 1) analytics_events: harden INSERT policy (require auth.uid() IS NOT NULL and user_id = auth.uid())
DROP POLICY IF EXISTS "Authenticated users can insert their analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
REVOKE INSERT ON public.analytics_events FROM anon;
REVOKE INSERT ON public.analytics_events FROM PUBLIC;
CREATE POLICY "Authenticated users can insert their analytics events"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 2) healthcare_institutions: drop broad "authenticated see everything" policy so only verified rows are visible
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.healthcare_institutions;

-- Ensure verified-only visibility remains
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='healthcare_institutions'
      AND cmd='SELECT' AND policyname='Authenticated users view verified institutions'
  ) THEN
    CREATE POLICY "Authenticated users view verified institutions"
      ON public.healthcare_institutions
      FOR SELECT
      TO authenticated
      USING (is_verified = true);
  END IF;
END $$;

-- 3) user_two_factor: hide raw secret column from client entirely. Move secret to a service-role-only table.
CREATE TABLE IF NOT EXISTS public.user_two_factor_secrets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  backup_codes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.user_two_factor_secrets FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.user_two_factor_secrets TO service_role;
ALTER TABLE public.user_two_factor_secrets ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated => no access. service_role bypasses RLS.

-- Backfill from existing user_two_factor if secret column present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_two_factor' AND column_name='secret') THEN
    INSERT INTO public.user_two_factor_secrets (user_id, secret, backup_codes)
    SELECT user_id, secret, COALESCE(backup_codes, '{}')
    FROM public.user_two_factor
    WHERE secret IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Remove secret + backup_codes exposure from public.user_two_factor
ALTER TABLE public.user_two_factor DROP COLUMN IF EXISTS secret;
ALTER TABLE public.user_two_factor DROP COLUMN IF EXISTS backup_codes;

-- Add backup_codes_remaining counter for client visibility
ALTER TABLE public.user_two_factor ADD COLUMN IF NOT EXISTS backup_codes_remaining int NOT NULL DEFAULT 0;
