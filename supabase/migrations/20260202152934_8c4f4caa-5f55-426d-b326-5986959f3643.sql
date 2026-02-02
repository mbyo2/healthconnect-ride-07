-- Drop the overly permissive storage policy for chat-attachments
DROP POLICY IF EXISTS "Chat attachments are publicly accessible" ON storage.objects;

-- Create restricted policy that only allows users to access attachments from their own conversations
CREATE POLICY "Users can access their chat attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments' AND
    EXISTS (
      SELECT 1 
      FROM public.chat_attachments ca
      JOIN public.messages m ON m.id = ca.message_id
      WHERE ca.file_url LIKE '%' || storage.objects.name
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );