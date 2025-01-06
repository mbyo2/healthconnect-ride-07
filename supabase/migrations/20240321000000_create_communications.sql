-- Create messages table first
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    read BOOLEAN DEFAULT false
);

-- Add RLS policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
    ON public.messages
    FOR SELECT
    USING (
        auth.uid() = sender_id 
        OR 
        auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
    );

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

-- Create video consultations table
CREATE TABLE IF NOT EXISTS public.video_consultations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_url TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add RLS policies for video consultations
ALTER TABLE public.video_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video consultations"
    ON public.video_consultations
    FOR SELECT
    USING (
        auth.uid() = patient_id 
        OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Users can create their own video consultations"
    ON public.video_consultations
    FOR INSERT
    WITH CHECK (
        auth.uid() = patient_id
    );

CREATE POLICY "Users can update their own video consultations"
    ON public.video_consultations
    FOR UPDATE
    USING (
        auth.uid() = patient_id 
        OR 
        auth.uid() = provider_id
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