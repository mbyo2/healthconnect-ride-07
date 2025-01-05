-- Create chat attachments table
CREATE TABLE IF NOT EXISTS public.chat_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies for chat attachments
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attachments"
    ON public.chat_attachments
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT sender_id FROM messages WHERE id = message_id
            UNION
            SELECT receiver_id FROM messages WHERE id = message_id
        )
    );

CREATE POLICY "Users can upload attachments"
    ON public.chat_attachments
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT sender_id FROM messages WHERE id = message_id
        )
    );

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name)
VALUES ('chat-attachments', 'chat-attachments')
ON CONFLICT DO NOTHING;

-- Add storage policies
CREATE POLICY "Chat attachments are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can upload chat attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-attachments' 
        AND auth.role() = 'authenticated'
    );