-- Create medical_records table
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    provider TEXT NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    hash TEXT NOT NULL,
    verified BOOLEAN DEFAULT true,
    shared_with TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own medical records"
    ON public.medical_records
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical records"
    ON public.medical_records
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical records"
    ON public.medical_records
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Insert some seed data for testing (optional, but good for immediate feedback)
-- Note: In a real app, we wouldn't seed user-specific data this way without a user ID, 
-- but we can leave it empty and let the frontend 'Add Record' (if we implement it) or just rely on the user adding it.
-- For this demo, we'll rely on the frontend to handle empty states or we could create a function to seed for a user.
