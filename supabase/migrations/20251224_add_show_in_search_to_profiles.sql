-- Add show_in_search to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_in_search BOOLEAN DEFAULT TRUE;
