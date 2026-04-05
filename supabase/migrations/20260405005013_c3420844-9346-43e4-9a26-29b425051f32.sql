-- Add the missing assign_default_role trigger on auth.users
-- This trigger populates user_roles when a new user signs up
CREATE TRIGGER on_auth_user_created_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();

-- Drop overly restrictive INSERT policies on profiles if they exist, then add a proper one
-- The handle_new_user trigger needs to insert profiles
DO $$
BEGIN
  -- Check if there's already a permissive INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND cmd = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow trigger profile creation" ON public.profiles FOR INSERT WITH CHECK (true)';
  END IF;
END $$;