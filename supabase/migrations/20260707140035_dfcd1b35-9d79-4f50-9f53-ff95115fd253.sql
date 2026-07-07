
-- Medical documents SELECT: scope to authenticated
DROP POLICY IF EXISTS "Users can view their own medical documents" ON storage.objects;
CREATE POLICY "Users can view their own medical documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical_documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Realtime messages: add topic-scoped guard
DROP POLICY IF EXISTS "Super admins can read realtime messages" ON realtime.messages;
CREATE POLICY "Super admins can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  AND realtime.topic() IS NOT NULL
  AND length(realtime.topic()) > 0
);

DROP POLICY IF EXISTS "Super admins can send realtime messages" ON realtime.messages;
CREATE POLICY "Super admins can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  AND realtime.topic() IS NOT NULL
  AND length(realtime.topic()) > 0
);
