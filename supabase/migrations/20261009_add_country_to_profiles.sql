-- Add country column to profiles (expected by admin ProviderApplications)
-- The admin dashboard queries profiles.country for provider accreditation

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'ZM';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.country IS 'ISO country code for the profile (e.g., ZM for Zambia)';
