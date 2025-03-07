
-- Add admin_id column to healthcare_institutions table 
ALTER TABLE IF EXISTS public.healthcare_institutions
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id);

-- Add review_notes column to health_personnel_applications table
ALTER TABLE IF EXISTS public.health_personnel_applications 
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Create superuser role
CREATE TYPE public.admin_level AS ENUM ('admin', 'superadmin');

-- Add admin_level column to profiles table
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS admin_level admin_level;

-- Create function to create admin users
CREATE OR REPLACE FUNCTION public.create_admin_user(email TEXT, password TEXT, is_superadmin BOOLEAN DEFAULT FALSE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create the user in auth.users
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) 
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'admin'),
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;
  
  -- Set the admin_level in the profiles table
  UPDATE public.profiles
  SET admin_level = CASE WHEN is_superadmin THEN 'superadmin'::admin_level ELSE 'admin'::admin_level END
  WHERE id = new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- Grant superadmin the ability to create admins
CREATE OR REPLACE FUNCTION public.can_create_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT admin_level = 'superadmin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;
