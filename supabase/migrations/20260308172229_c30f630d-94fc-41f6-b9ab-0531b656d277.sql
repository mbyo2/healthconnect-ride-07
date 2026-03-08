
-- Create a storage bucket for registration/license documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'registration_documents',
  'registration_documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload their own documents
CREATE POLICY "Users can upload own registration docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'registration_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can view their own documents
CREATE POLICY "Users can view own registration docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'registration_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Admins can view all registration documents
CREATE POLICY "Admins can view all registration docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'registration_documents'
  AND public.is_admin_via_profiles(auth.uid())
);

-- RLS: Users can delete their own documents
CREATE POLICY "Users can delete own registration docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'registration_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
