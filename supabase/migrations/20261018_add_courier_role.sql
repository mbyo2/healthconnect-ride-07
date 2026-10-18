-- Add courier to user_role and app_role enums

DO $$
BEGIN
  -- Add to user_role enum (profiles.role)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'user_role' AND pg_enum.enumlabel = 'courier'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'courier';
  END IF;

  -- Add to app_role enum (user_roles.role)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'app_role' AND pg_enum.enumlabel = 'courier'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'courier';
  END IF;
END $$;
