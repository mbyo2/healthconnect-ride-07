-- Drop the broken trigger on profiles table that calls assign_default_role()
-- assign_default_role() expects NEW.raw_user_meta_data (auth.users column)
-- but this trigger fires on profiles which doesn't have that column
DROP TRIGGER IF EXISTS on_user_created_assign_role ON public.profiles;