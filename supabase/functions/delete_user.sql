CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the ID of the authenticated user
  user_id := auth.uid();
  
  -- Delete user's avatar from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = user_id::text;
  
  -- Delete user's profile
  DELETE FROM public.profiles
  WHERE id = user_id;
  
  -- Delete the user's auth account
  DELETE FROM auth.users
  WHERE id = user_id;
END;
$$;