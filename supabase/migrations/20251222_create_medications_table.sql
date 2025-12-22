
-- Create medications table
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    next_dose TIMESTAMP WITH TIME ZONE,
    remaining INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own medications"
    ON public.medications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medications"
    ON public.medications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medications"
    ON public.medications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medications"
    ON public.medications FOR DELETE
    USING (auth.uid() = user_id);


-- Trigger for updated_at
CREATE TRIGGER handle_medications_updated_at
    BEFORE UPDATE ON public.medications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
