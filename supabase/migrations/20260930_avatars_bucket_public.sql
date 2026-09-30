-- Make the avatars storage bucket public so profile photos render.
-- The frontend uses getPublicUrl() which requires the bucket's public flag.
-- Idempotent: creates the bucket if missing, otherwise flips public=true.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;
